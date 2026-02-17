import { EditionsService } from "../../hub-api/services/EditionsService";

export const saveNote = async (
  key: string,
  data: { note: string },
): Promise<void> => {
  console.log("Saving note", { key, ...data });
  await EditionsService.postEditionsNotes({
    key,
    note: { note: data.note },
  });
};
