import type { IncomingMessage, ServerResponse } from "http";
import { exec } from "child_process";
import { promisify } from "util";
import { sendErrorResponse, sendJsonResponse } from "../util-request";
import { callGitHubApi } from "../util-github";
import { logInfo, logWarn, logError } from "../logger";
import {
  REPO_API_PATH_PREFIX,
  REPO_PR_API_PATH,
  REPO_PULL_API_PATH,
} from "../../common/api";

const execAsync = promisify(exec);

export const isRepoRequest = (req: IncomingMessage): boolean => {
  return !!req.url?.startsWith(REPO_API_PATH_PREFIX);
};

export const handleRepoRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  const startTime = Date.now();
  const url = req.url!;
  const authHeader = req.headers["authorization"];

  logInfo("Processing repo request", {
    url,
    method: req.method,
    hasAuthHeader: !!authHeader,
  });

  if (url === REPO_PULL_API_PATH && req.method === "POST") {
    logInfo("Executing git pull operation");
    try {
      const { stdout, stderr } = await execAsync("git pull", {
        cwd: process.cwd(),
      });

      const duration = Date.now() - startTime;
      logInfo("Git pull completed successfully", {
        duration: `${duration}ms`,
        stdoutLength: stdout.length,
        stderrLength: stderr.length,
      });

      sendJsonResponse(res, 200, {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logError("Git pull failed", {
        error: error.message,
        duration: `${duration}ms`,
        stack: error.stack,
      });
      sendErrorResponse(res, 500, `Git pull failed: ${error.message}`);
    }
  } else if (url === REPO_PR_API_PATH && req.method === "POST") {
    logInfo("Starting PR workflow");
    try {
      if (!authHeader) {
        logWarn("Missing authorization header for PR creation");
        sendErrorResponse(
          res,
          401,
          "Authorization header required for PR creation",
        );
        return;
      }

      logInfo("Executing git pull");
      try {
        await execAsync("git pull", { cwd: process.cwd() });
        logInfo("Git pull completed successfully");
      } catch (pullError: any) {
        logError("Git pull failed", { error: pullError.message });
        sendErrorResponse(res, 500, `Git pull failed: ${pullError.message}`);
        return;
      }

      const repoInfo = await execAsync("git config --get remote.origin.url");
      const repoUrl = repoInfo.stdout.trim();
      logInfo("Retrieved repository URL", { repoUrl });

      const repoMatch = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (!repoMatch) {
        logError("Unable to parse GitHub repository from URL", { repoUrl });
        sendErrorResponse(res, 400, "Unable to determine GitHub repository");
        return;
      }

      const [, owner, repo] = repoMatch;
      logInfo("Parsed GitHub repository info", { owner, repo });

      const currentBranch = await execAsync("git branch --show-current");
      let branchName = currentBranch.stdout.trim();
      logInfo("Current git branch determined", { branchName });

      if (branchName === "main") {
        logInfo("On main branch, checking for existing open PRs");
        try {
          const openPRs = await callGitHubApi<Array<{ head: { ref: string } }>>(
            {
              token: authHeader,
              endpoint: `/repos/${owner}/${repo}/pulls?state=open`,
              method: "GET",
            },
          );

          const existingEditorPR = openPRs.find((pr) =>
            pr.head.ref.startsWith("editor-"),
          );

          if (existingEditorPR) {
            branchName = existingEditorPR.head.ref;
            logInfo("Found existing open PR, switching to existing branch", {
              branchName,
            });
            await execAsync(`git checkout ${branchName}`);
          } else {
            const timestamp = new Date()
              .toISOString()
              .slice(0, 16)
              .replace(/[-:]/g, "")
              .replace("T", "-");
            branchName = `editor-${timestamp}`;

            logInfo("Creating new branch", { branchName });
            await execAsync(`git checkout -b ${branchName}`);
            logInfo("Successfully created and switched to new branch", {
              branchName,
            });
          }
        } catch (prCheckError: any) {
          logError("Failed to check for existing PRs", {
            error: prCheckError.message,
          });
          sendErrorResponse(
            res,
            500,
            `Failed to check for existing PRs: ${prCheckError.message}`,
          );
          return;
        }
      }

      logInfo("Checking for changes in public/docs");
      try {
        const statusResult = await execAsync(
          "git status --porcelain public/docs/",
        );
        const changes = statusResult.stdout.trim();

        if (changes) {
          logInfo("Found changes in public/docs, committing", { changes });
          await execAsync("git add public/docs/");

          const timestamp = new Date().toISOString();
          const commitMessage = `Update documentation files - ${timestamp}`;
          await execAsync(`git commit -m "${commitMessage}"`);
          logInfo("Successfully committed changes", { commitMessage });
        } else {
          logInfo("No changes found in public/docs");
        }
      } catch (commitError: any) {
        logError("Failed to commit changes", { error: commitError.message });
        sendErrorResponse(
          res,
          500,
          `Failed to commit changes: ${commitError.message}`,
        );
        return;
      }

      logInfo("Pushing branch to origin", { branchName });
      await execAsync(`git push -u origin ${branchName}`);

      logInfo("Checking for existing PR for branch", { branchName });
      try {
        const existingPRs = await callGitHubApi<
          Array<{ number: number; html_url: string }>
        >({
          token: authHeader,
          endpoint: `/repos/${owner}/${repo}/pulls?head=${owner}:${branchName}&state=open`,
          method: "GET",
        });

        let prData;
        if (existingPRs.length > 0) {
          prData = existingPRs[0];
          logInfo("Found existing PR", {
            prNumber: prData.number,
            prUrl: prData.html_url,
          });
        } else {
          logInfo("Creating new PR", { branchName });
          prData = await callGitHubApi<{
            html_url: string;
            number: number;
          }>({
            token: authHeader,
            endpoint: `/repos/${owner}/${repo}/pulls`,
            method: "POST",
            body: {
              title: `Documentation updates - ${branchName}`,
              head: branchName,
              base: "main",
              body: "Automated PR for documentation updates created from editor",
            },
          });
          logInfo("Created new PR", {
            prNumber: prData.number,
            prUrl: prData.html_url,
          });
        }

        const duration = Date.now() - startTime;
        logInfo("PR workflow completed successfully", {
          branchName,
          prNumber: prData.number,
          prUrl: prData.html_url,
          owner,
          repo,
          duration: `${duration}ms`,
        });

        sendJsonResponse(res, 200, {
          success: true,
          branchName: branchName,
          prUrl: prData.html_url,
          prNumber: prData.number,
        });
      } catch (prError: any) {
        logError("Failed to handle PR creation/check", {
          error: prError.message,
        });
        sendErrorResponse(res, 500, `Failed to handle PR: ${prError.message}`);
        return;
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logError("PR workflow failed", {
        error: error.message,
        url,
        duration: `${duration}ms`,
        stack: error.stack,
      });
      sendErrorResponse(res, 500, `PR workflow failed: ${error.message}`);
    }
  } else {
    logWarn("Unknown repo endpoint requested", { url, method: req.method });
    sendErrorResponse(res, 404, "Endpoint not found");
  }
};
