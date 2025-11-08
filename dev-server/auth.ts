import { callGitHubApi } from "./util-github";

const allowList = ["reallyliri", "miajosko"];

export const validateAuthToken = async (
  token: string,
): Promise<string | null> => {
  try {
    const user = await callGitHubApi<{ login: string }>({
      token,
      endpoint: "/user",
    });

    console.info("User", user?.login);
    return user && user.login && allowList.includes(user.login.toLowerCase())
      ? user.login
      : null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("401")) {
      return null;
    }
    console.warn("Failed to validate token:", errorMessage);
    return null;
  }
};
