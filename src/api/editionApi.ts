import {
  EDITION_API_PATH,
  EditionRequestBody,
  USTC_LOOKUP_API_PATH,
  UstcResult,
} from "../../common/api.ts";
import { uploadImage } from "./imageApi.ts";

export const upsertEdition = async (
  data: EditionRequestBody,
  images: Record<string, File>,
  authToken: string,
): Promise<void> => {
  console.log("Upserting edition:", data);

  const uploads: Promise<void>[] = [];

  // Handle shelfmark images
  for (let i = 0; i < data.shelfmarks.length; i++) {
    const shelfmark = data.shelfmarks[i];
    if (shelfmark.title_page_img) {
      const file = images[shelfmark.title_page_img];
      if (!file) {
        continue;
      }
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
      if (!file) {
        continue;
      }
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

  // Handle visual element example images
  for (let i = 0; i < data.visualElements.length; i++) {
    const visualElement = data.visualElements[i];
    for (let j = 0; j < visualElement.examples.length; j++) {
      const example = visualElement.examples[j];
      if (example.img) {
        const file = images[example.img];
        if (!file) {
          continue;
        }
        uploads.push(
          (async () => {
            example.img = await uploadImage(
              data.key,
              file,
              `visEl_${i + 1}_ex_${j + 1}`,
              authToken,
            );
          })(),
        );
      }
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

export const deleteEdition = async (
  key: string,
  authToken: string,
): Promise<void> => {
  const response = await fetch(EDITION_API_PATH, {
    method: "DELETE",
    headers: {
      Authorization: authToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ key }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to delete edition: ${response.status} ${response.statusText}`,
    );
  }
};

export const ustcLookup = async (
  ustcId: string,
  authToken: string,
): Promise<Partial<UstcResult>> => {
  const response = await fetch(`${USTC_LOOKUP_API_PATH}/${ustcId}`, {
    headers: {
      Authorization: authToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to lookup in USTC: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as Partial<UstcResult>;
};
