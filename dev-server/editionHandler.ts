import type { IncomingMessage, ServerResponse } from "http";
import {
  loadCsvData,
  saveCsvData,
  parseRequestBody,
  sendJsonResponse,
  sendErrorResponse,
} from "./common";

const EDITION_API_PATH = "/api/edition";

type EditionRequestBody = {
  key: string | null;
  shortTitle: string;
  shortTitleSource: string;
  notes: string;
  corpus: string | null;
  urlByVolume: Record<string, string>;
  shelfmark: string | null;
  title_page_img: string[];
  frontispiece_img: string[];
  annotations: string | null;
  copyright: string | null;
  verified: boolean;
} & (
  | {
      isManuscript: true;
      manuscriptYearFrom: number;
      manuscriptYearTo: number;
    }
  | {
      isManuscript: false;
      year: string;
      languages: string[];
      editor: string[];
      publisher: string[];
      format: number | null;
      volumes: number | null;
      ustcId: string | null;
      title: string | null;
      title_EN: string | null;
      imprint: string | null;
      imprint_EN: string | null;
      colophon: string | null;
      colophon_EN: string | null;
      frontispiece: string | null;
      frontispiece_EN: string | null;
    }
) &
  (
    | { isElements: false }
    | {
        isElements: true;
        books: number[];
        additionalContent: string[];
      }
  );

const upsertEdition = (edition: EditionRequestBody): void => {
  edition.key =
    edition.key || Math.random().toString(36).slice(2, 8).toUpperCase();
  const csvFile = getCsvFilePath(edition.type || "secondary");
  const parsed = loadCsvData(csvFile);

  if (edition.key) {
    const existingIndex = parsed.data.findIndex(
      (row) => row.key === edition.key,
    );
    if (existingIndex !== -1) {
      throw new Error(`Edition with key ${edition.key} already exists`);
    }
  }

  const newRow: Record<string, string> = {
    key: edition.key || "",
    year: edition.year || "",
    city: edition.city || "",
    language: edition.language || "",
    "author (normalized)": edition["author (normalized)"] || "",
    title: edition.title || "",
    title_EN: edition.title_EN || "",
    type: edition.type || "secondary",
    "publisher (normalized)": edition["publisher (normalized)"] || "",
    imprint: edition.imprint || "",
    imprint_EN: edition.imprint_EN || "",
    ustc_id: edition.ustc_id || "",
    scan_url: edition.scan_url || "",
    tp_url: edition.tp_url || "",
    notes: edition.notes || "",
  };

  parsed.data.push(newRow);
  saveCsvData(csvFile, parsed.data);
};

export const isEditionRequest = (req: IncomingMessage): boolean => {
  return req.method === "POST" && req.url === EDITION_API_PATH;
};

export const handleEditionRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  try {
    const edition = await parseRequestBody<EditionRequestBody>(req);
    upsertEdition(edition);
    sendJsonResponse(res, 201, { success: true, key: edition.key || "" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("already exists")) {
      sendErrorResponse(res, 409, message);
    } else if (message.includes("not found")) {
      sendErrorResponse(res, 404, message);
    } else {
      sendErrorResponse(res, 500, `Error creating edition: ${message}`);
    }
  }
};
