import type { IncomingMessage, ServerResponse } from "http";
import { sendErrorResponse, sendJsonResponse } from "../util-request";
import { callGitHubApi } from "../util-github";
import { logInfo, logWarn, logError } from "../logger";
import {
  REPO_API_PATH_PREFIX,
  REPO_PR_API_PATH,
  REPO_PULL_API_PATH,
} from "../../common/api";

import { exec, ExecOptions } from "child_process";

type ExecResult = { stdout: string; stderr: string };

export const execAsync = (
  cmd: string,
  options: ExecOptions = {},
): Promise<ExecResult> => {
  console.log(`→ Executing: ${cmd}`);
  if (options.cwd) console.log(`  cwd: ${options.cwd}`);

  const opts: ExecOptions = {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  };

  return new Promise((resolve, reject) => {
    exec(cmd, opts, (error, stdout, stderr) => {
      const out = stdout?.toString().trim();
      const err = stderr?.toString().trim();
      if (out) console.log(`stdout:\n${out}`);
      if (err) console.error(`stderr:\n${err}`);

      if (error) {
        console.error(`✗ Command failed: ${cmd}`);
        reject(Object.assign(error, { stdout, stderr }));
      } else {
        console.log(`✓ Command succeeded: ${cmd}`);
        resolve({ stdout: out, stderr: err });
      }
    });
  });
};

export const isRepoRequest = (req: IncomingMessage): boolean => {
  return !!req.url?.startsWith(REPO_API_PATH_PREFIX);
};

const getCurrentBranch = async (): Promise<string> => {
  const currentBranchRes = await execAsync("git branch --show-current");
  return currentBranchRes.stdout.trim();
};

const getRepoInfo = async (): Promise<{ owner: string; repo: string }> => {
  const repoInfo = await execAsync("git config --get remote.origin.url");
  const repoUrl = repoInfo.stdout.trim();

  const repoMatch = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (!repoMatch) {
    throw new Error(
      `Unable to determine GitHub repository from URL: ${repoUrl}`,
    );
  }

  const [, owner, repo] = repoMatch;
  return { owner, repo };
};

const getExistingPullRequest = async (
  branchName: string,
  authToken: string,
): Promise<{ number: number; html_url: string } | null> => {
  const { owner, repo } = await getRepoInfo();

  const existingPRs = await callGitHubApi<
    Array<{ number: number; html_url: string }>
  >({
    token: authToken,
    endpoint: `/repos/${owner}/${repo}/pulls?head=${owner}:${branchName}&state=open`,
    method: "GET",
  });

  if (existingPRs.length > 0) {
    return existingPRs[0];
  }
  return null;
};

const handlePullRequest = async (
  authHeader: string,
): Promise<{ branch: string }> => {
  // check current branch
  let currentBranch: string;
  try {
    currentBranch = await getCurrentBranch();
  } catch (error: any) {
    throw new Error(`Failed to get current branch: ${error.message}`);
  }

  // if not main, check for existing PR
  if (currentBranch !== "main") {
    let existingPR;
    try {
      existingPR = await getExistingPullRequest(currentBranch, authHeader);
      if (existingPR) {
        logInfo("Found existing PR for current branch", {
          branchName: currentBranch,
          prNumber: existingPR.number,
          prUrl: existingPR.html_url,
        });
      } else {
        logInfo("No existing PR found for branch", {
          branchName: currentBranch,
        });
      }
    } catch (error: any) {
      throw new Error(`Failed to get current branch: ${error.message}`);
    }

    // if there is no existing PR, switch to main
    if (!existingPR) {
      try {
        await execAsync("git checkout main");
        logInfo("Switched to main branch");
        currentBranch = "main";
      } catch (checkoutError: any) {
        throw new Error(
          `Failed to checkout main branch: ${checkoutError.message}`,
        );
      }
    }
  }

  // pull latest changes, either on main or in current branch if PR exists
  try {
    const { stdout, stderr } = await execAsync("git pull", {
      cwd: process.cwd(),
    });
    logInfo("Git pull completed successfully", {
      stdoutLength: stdout.length,
      stderrLength: stderr.length,
    });
  } catch (error: any) {
    throw new Error(`Failed to get current branch: ${error.message}`);
  }

  return { branch: currentBranch };
};

export const handleRepoRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  const startTime = Date.now();
  const url = req.url!;
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    logWarn("Missing authorization header");
    sendErrorResponse(
      res,
      401,
      "Authorization header required for PR creation",
    );
    return;
  }

  if (!(url === REPO_PULL_API_PATH || url === REPO_PR_API_PATH)) {
    logWarn("Invalid repo endpoint requested", { url });
    sendErrorResponse(res, 404, "Endpoint not found");
    return;
  }

  if (req.method !== "POST") {
    logWarn("Invalid method for repo endpoint", { url, method: req.method });
    sendErrorResponse(res, 405, "Method not allowed");
    return;
  }

  logInfo("Processing repo request", {
    url,
    method: req.method,
    hasAuthHeader: !!authHeader,
  });

  let branch: string;
  try {
    const res = await handlePullRequest(authHeader);
    branch = res.branch;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError("Repo request handling failed", {
      error: error.message,
      url,
      duration: `${duration}ms`,
      stack: error.stack,
    });
    sendErrorResponse(
      res,
      500,
      `Repo request handling failed: ${error.message}`,
    );
    return;
  }

  // if we only wanted to pull, return now
  if (url === REPO_PULL_API_PATH) {
    sendJsonResponse(res, 200, {
      success: true,
      branch: branch,
    });
    return;
  }

  // check if there are any changes to files in public/docs/ or public/tps/
  let statusRes: ExecResult;
  try {
    statusRes = await execAsync(
      "git status --porcelain public/docs/ public/tps/",
    );
  } catch (error: any) {
    sendErrorResponse(res, 500, `Failed to check git status: ${error.message}`);
    return;
  }
  if (!statusRes.stdout.trim()) {
    logInfo(
      "No changes detected in public/docs/ or public/tps/, skipping PR creation",
    );
    sendJsonResponse(res, 200, {
      success: true,
      branchName: branch,
      prUrl: null,
      prNumber: null,
    });
    return;
  }

  if (branch === "main") {
    // create new branch
    const timestamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/[-:]/g, "")
      .replace("T", "-");
    branch = `editor-${timestamp}`;

    logInfo("Creating new branch", { branch });
    try {
      await execAsync(`git checkout -b ${branch}`);
    } catch (error: any) {
      sendErrorResponse(
        res,
        500,
        `Failed to create new branch: ${error.message}`,
      );
      return;
    }
    logInfo("Successfully created and switched to new branch", {
      branch,
    });

    // push new branch
    logInfo("Pushing new branch to origin", { branch });
    try {
      await execAsync(`git push -u origin ${branch}`);
    } catch (error: any) {
      sendErrorResponse(
        res,
        500,
        `Failed to push new branch: ${error.message}`,
      );
      return;
    }
  }

  // commit CSV changes to public/docs and public/tps
  logInfo("Committing changes to public/docs and public/tps", { branch });
  try {
    await execAsync("git add public/docs/ public/tps/");
    const commitMessage = `Update documentation files - ${new Date().toISOString()}`;
    await execAsync(`git commit -m "${commitMessage}"`);
    logInfo("Successfully committed changes", { commitMessage });
  } catch (error: any) {
    sendErrorResponse(res, 500, `Failed to commit changes: ${error.message}`);
    return;
  }

  // push branch updates
  logInfo("Pushing branch updates to origin", { branch });
  try {
    await execAsync(`git push origin ${branch}`);
  } catch (error: any) {
    sendErrorResponse(
      res,
      500,
      `Failed to push branch updates: ${error.message}`,
    );
    return;
  }

  // create PR if it doesn't exist
  let existingPR = await getExistingPullRequest(branch, authHeader);
  if (!existingPR) {
    logInfo("Creating new PR", { branch });
    try {
      const { owner, repo } = await getRepoInfo();
      existingPR = await callGitHubApi<{
        html_url: string;
        number: number;
      }>({
        token: authHeader,
        endpoint: `/repos/${owner}/${repo}/pulls`,
        method: "POST",
        body: {
          title: `Metadata updates - ${branch}`,
          head: branch,
          base: "main",
          body: "Automated PR for documentation updates created from editor",
        },
      });
      logInfo("Created new PR", existingPR);
    } catch (error: any) {
      sendErrorResponse(res, 500, `Failed to create PR: ${error.message}`);
      return;
    }
  }

  // final response
  const duration = Date.now() - startTime;
  logInfo("PR workflow completed successfully", {
    branch,
    duration: `${duration}ms`,
  });
  sendJsonResponse(res, 200, {
    success: true,
    branchName: branch,
    prUrl: existingPR?.html_url,
    prNumber: existingPR?.number,
  });
  return;
};
