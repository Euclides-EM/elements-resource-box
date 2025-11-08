import type { IncomingMessage, ServerResponse } from "http";
import { exec } from "child_process";
import { promisify } from "util";
import { sendErrorResponse, sendJsonResponse } from "../util-request";
import { callGitHubApi } from "../util-github";

const execAsync = promisify(exec);

export const isRepoRequest = (req: IncomingMessage): boolean => {
  return !!req.url?.startsWith("/repo/");
};

export const handleRepoRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  const url = req.url!;
  const authHeader = req.headers["authorization"];

  if (url === "/repo/pull" && req.method === "POST") {
    try {
      const { stdout, stderr } = await execAsync("git pull", {
        cwd: process.cwd(),
      });
      sendJsonResponse(res, 200, {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    } catch (error: any) {
      sendErrorResponse(res, 500, `Git pull failed: ${error.message}`);
    }
  } else if (url === "/repo/pr" && req.method === "POST") {
    try {
      const currentBranch = await execAsync("git branch --show-current");
      const branchName = currentBranch.stdout.trim();

      if (branchName === "main") {
        sendErrorResponse(res, 400, "Cannot create PR from main branch");
        return;
      }

      await execAsync(`git push -u origin ${branchName}`);

      if (!authHeader) {
        sendErrorResponse(
          res,
          401,
          "Authorization header required for PR creation",
        );
        return;
      }

      const repoInfo = await execAsync("git config --get remote.origin.url");
      const repoUrl = repoInfo.stdout.trim();
      const repoMatch = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);

      if (!repoMatch) {
        sendErrorResponse(res, 400, "Unable to determine GitHub repository");
        return;
      }

      const [, owner, repo] = repoMatch;

      const prData = await callGitHubApi<{
        html_url: string;
        number: number;
      }>({
        token: authHeader,
        endpoint: `/repos/${owner}/${repo}/pulls`,
        method: "POST",
        body: {
          title: `Editor review - ${branchName}`,
          head: branchName,
          base: "main",
          body: "Automated PR created from editor",
        },
      });
      sendJsonResponse(res, 200, {
        success: true,
        branchName: branchName,
        prUrl: prData.html_url,
        prNumber: prData.number,
      });
    } catch (error: any) {
      sendErrorResponse(res, 500, `PR creation failed: ${error.message}`);
    }
  } else {
    sendErrorResponse(res, 404, "Endpoint not found");
  }
};
