const allowList = ["reallyliri", "miajosko"];

export const validateAuthToken = async (
  token: string,
): Promise<string | null> => {
  const userResp = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (userResp.status === 401) {
    return null;
  }
  if (!userResp.ok) {
    console.warn(
      "Failed to validate token:",
      userResp.status,
      userResp.statusText,
    );
    return null;
  }

  const user = (await userResp.json()) as {
    login: string;
  };
  console.info("User", user?.login);
  return user && user.login && allowList.includes(user.login.toLowerCase())
    ? user.login
    : null;
};
