import { NOTES_API_PATH, NotesRequestBody } from "../../common/api.ts";

export const saveNote = async (
  key: string,
  authToken: string,
  data: NotesRequestBody,
): Promise<void> => {
  console.log("Saving note", { key, ...data });

  const response = await fetch(`${NOTES_API_PATH}/${key}`, {
    method: "POST",
    headers: {
      Authorization: authToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to save note: ${response.status} ${response.statusText}`,
    );
  }
};
