import type { IncomingMessage, ServerResponse } from "http";
import { loadCsvData, saveCsvData } from "../util-csv";
import { CSV_PATH_ITEMS_PRINT, PrintDetails } from "../../common/csv";
import { NOTES_API_PATH, NotesRequestBody } from "../../common/api";
import {
  parseRequestBody,
  sendErrorResponse,
  sendJsonResponse,
} from "../util-request";
import { logInfo, logWarn, logError } from "../logger";

const updateNotesInCsv = (key: string, note: string): void => {
  logInfo("Starting CSV update for notes", {
    key,
    noteLength: note?.length || 0,
  });

  const items = loadCsvData<PrintDetails>(CSV_PATH_ITEMS_PRINT);
  logInfo("Loaded CSV data", { totalItems: items.length });

  const rowIndex = items.findIndex((row) => row.key === key);
  if (rowIndex === -1) {
    logError("Item not found in CSV", { key, totalItems: items.length });
    throw new Error(`Item with key ${key} not found`);
  }

  const oldNote = items[rowIndex].notes;
  items[rowIndex].notes = note || "";
  saveCsvData(CSV_PATH_ITEMS_PRINT, items);

  logInfo("Successfully updated notes in CSV", {
    key,
    rowIndex,
    oldNoteLength: oldNote?.length || 0,
    newNoteLength: note?.length || 0,
  });
};

export const isNotesRequest = (req: IncomingMessage): boolean => {
  return req.method === "POST" && !!req.url?.startsWith(NOTES_API_PATH);
};

export const handleNotesRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  const startTime = Date.now();
  logInfo("Processing notes request", { url: req.url, method: req.method });

  try {
    const key = decodeURIComponent(req.url!.replace(NOTES_API_PATH, ""));
    logInfo("Extracted key from URL", { key, originalUrl: req.url });

    if (!key) {
      logWarn("Missing key parameter", { url: req.url });
      sendErrorResponse(res, 400, "Missing key parameter");
      return;
    }

    const { note } = await parseRequestBody<NotesRequestBody>(req);
    logInfo("Parsed request body", { key, noteLength: note?.length || 0 });

    updateNotesInCsv(key, note);

    const duration = Date.now() - startTime;
    logInfo("Notes request completed successfully", {
      key,
      duration: `${duration}ms`,
      responseStatus: 200,
    });

    sendJsonResponse(res, 200, { success: true, key, note });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const duration = Date.now() - startTime;

    logError("Notes request failed", {
      error: message,
      url: req.url,
      duration: `${duration}ms`,
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (message.includes("not found")) {
      sendErrorResponse(res, 404, message);
    } else {
      sendErrorResponse(res, 500, `Error updating notes: ${message}`);
    }
  }
};
