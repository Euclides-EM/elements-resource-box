import { REPO_PULL_API_PATH, REPO_PR_API_PATH } from "../../common/api.ts";

export interface RepoPullResponse {
  success: boolean;
  stdout: string;
  stderr: string;
}

export interface RepoPrResponse {
  success: boolean;
  branchName: string;
  prUrl: string;
  prNumber: number;
}

export const pullRepo = async (
  authToken: string,
): Promise<RepoPullResponse> => {
  console.log("Pulling repository");

  const response = await fetch(REPO_PULL_API_PATH, {
    method: "POST",
    headers: {
      Authorization: authToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to pull repository: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return response.json();
};

export const createPullRequest = async (
  authToken: string,
): Promise<RepoPrResponse> => {
  console.log("Creating pull request");

  const response = await fetch(REPO_PR_API_PATH, {
    method: "POST",
    headers: {
      Authorization: authToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create pull request: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return response.json();
};
