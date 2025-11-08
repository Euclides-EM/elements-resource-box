export interface GitHubApiOptions {
  token: string;
  endpoint: string;
  method?: string;
  body?: Record<string, unknown>;
}

export const callGitHubApi = async <T extends Record<string, unknown>>(
  options: GitHubApiOptions,
): Promise<T> => {
  const { token, endpoint, method = "GET", body } = options;

  const response = await fetch(`https://api.github.com${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body && { "Content-Type": "application/json" }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GitHub API request failed: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return response.json();
};
