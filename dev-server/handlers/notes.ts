import type { IncomingMessage, ServerResponse } from "http";
import { loadCsvData, saveCsvData } from "../util-csv";
import { CSV_PATH_ITEMS_PRINT, PrintDetails } from "../../common/csv";
import { NOTES_API_PATH, NotesRequestBody } from "../../common/api";
import {
  parseRequestBody,
  sendErrorResponse,
  sendJsonResponse,
} from "../util-request";

const updateNotesInCsv = (key: string, note: string): void => {
  const items = loadCsvData<PrintDetails>(CSV_PATH_ITEMS_PRINT);

  const rowIndex = items.findIndex((row) => row.key === key);
  if (rowIndex === -1) {
    throw new Error(`Item with key ${key} not found`);
  }

  items[rowIndex].notes = note || "";
  saveCsvData(CSV_PATH_ITEMS_PRINT, items);
};

export const isNotesRequest = (req: IncomingMessage): boolean => {
  return req.method === "POST" && !!req.url?.startsWith(NOTES_API_PATH);
};

export const handleNotesRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  try {
    const key = decodeURIComponent(req.url!.replace(NOTES_API_PATH, ""));

    if (!key) {
      sendErrorResponse(res, 400, "Missing key parameter");
      return;
    }

    const { note } = await parseRequestBody<NotesRequestBody>(req);
    updateNotesInCsv(key, note);
    sendJsonResponse(res, 200, { success: true, key, note });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("not found")) {
      sendErrorResponse(res, 404, message);
    } else {
      sendErrorResponse(res, 500, `Error updating notes: ${message}`);
    }
  }
};
