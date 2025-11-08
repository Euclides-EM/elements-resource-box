import { EDITION_API_PATH, EditionRequestBody } from "../../common/api.ts";

export const addEdition = async (
  data: EditionRequestBody,
  authToken: string,
): Promise<void> => {
  const response = await fetch(EDITION_API_PATH, {
    method: "POST",
    headers: {
      Authorization: authToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create edition: ${response.status} ${response.statusText}`,
    );
  }
};
