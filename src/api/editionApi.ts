import { EDITION_API_PATH, EditionRequestBody } from "../../common/api.ts";
import { uploadImage } from "./imageApi.ts";

export const upsertEdition = async (
  data: EditionRequestBody,
  images: Record<string, File>,
  authToken: string,
): Promise<void> => {
  console.log("Upsertting edition:", data);

  const uploads: Promise<void>[] = [];

  for (let i = 0; i < data.shelfmarks.length; i++) {
    const shelfmark = data.shelfmarks[i];
    if (shelfmark.title_page_img) {
      const file = images[shelfmark.title_page_img];
      uploads.push(
        (async () => {
          shelfmark.title_page_img = await uploadImage(
            data.key,
            file,
            `tp_${i + 1}`,
            authToken,
          );
        })(),
      );
    }
    if (shelfmark.frontispiece_img) {
      const file = images[shelfmark.frontispiece_img];
      uploads.push(
        (async () => {
          shelfmark.frontispiece_img = await uploadImage(
            data.key,
            file,
            `frontispiece_${i + 1}`,
            authToken,
          );
        })(),
      );
    }
  }

  await Promise.all(uploads);

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
