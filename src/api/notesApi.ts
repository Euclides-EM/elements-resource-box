export interface SaveNoteRequest {
  note: string;
}

export interface SaveNoteResponse {
  success: boolean;
  key: string;
  note: string;
}

export const saveNote = async (
  key: string,
  data: SaveNoteRequest,
): Promise<SaveNoteResponse> => {
  const response = await fetch(`/api/notes/${key}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to save note: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
};
