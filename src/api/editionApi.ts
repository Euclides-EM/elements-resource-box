import { EditionsService, ThirdPartyCatalogsService } from "../../hub-api";
import type { model_Edition, model_USTC } from "../../hub-api";
import { uploadImage } from "./imageApi.ts";

export const upsertEdition = async (
  data: model_Edition,
  images: Record<string, File>,
): Promise<void> => {
  console.log("Upserting edition:", data);

  const uploads: Promise<void>[] = [];

  for (let i = 0; i < (data.shelfmarks?.length ?? 0); i++) {
    const shelfmark = data.shelfmarks![i];
    if (shelfmark.title_page_img) {
      const file = images[shelfmark.title_page_img];
      if (!file) {
        continue;
      }
      uploads.push(
        (async () => {
          shelfmark.title_page_img = await uploadImage(
            data.key!,
            file,
            `tp_${i + 1}`,
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
            data.key!,
            file,
            `frontispiece_${i + 1}`,
          );
        })(),
      );
    }
  }

  for (let i = 0; i < (data.visualElements?.length ?? 0); i++) {
    const visualElement = data.visualElements![i];
    for (let j = 0; j < (visualElement.examples?.length ?? 0); j++) {
      const example = visualElement.examples![j];
      if (example.img) {
        const file = images[example.img];
        if (!file) {
          continue;
        }
        uploads.push(
          (async () => {
            example.img = await uploadImage(
              data.key!,
              file,
              `visEl_${i + 1}_ex_${j + 1}`,
            );
          })(),
        );
      }
    }
  }

  await Promise.all(uploads);

  try {
    await EditionsService.getEditions({ key: data.key! });
    await EditionsService.putEditions({ key: data.key!, edition: data });
  } catch {
    await EditionsService.postEditions({ edition: data });
  }
};

export const deleteEdition = async (key: string): Promise<void> => {
  await EditionsService.putEditions({
    key,
    edition: { key },
  });
};

export const ustcLookup = async (
  ustcId: string,
): Promise<Partial<model_USTC>> => {
  return ThirdPartyCatalogsService.postCatalogsUstcLookup({
    ustc: { ustc_id: parseInt(ustcId, 10) },
  });
};
