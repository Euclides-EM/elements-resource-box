import type { IncomingMessage, ServerResponse } from "http";
import {
  CSV_PATH_CORPUSES,
  CSV_PATH_ITEMS_MANUSCRIPT,
  CSV_PATH_ITEMS_PRINT,
  CSV_PATH_MD_MANUSCRIPT,
  CSV_PATH_MD_PRINT,
  CSV_PATH_REVIEWS,
  CSV_PATH_SHELFMARKS,
  CSV_PATH_TRANSCRIPTIONS,
  CSV_PATH_TRANSLATIONS,
  ManuscriptDetails,
  ManuscriptElementsMetadata,
  ParatextTranscriptions,
  PrintDetails,
  PrintElementsMetadata,
  Review,
  Shelfmarks,
  StudyCorpuses,
} from "../../common/csv";
import {
  parseRequestBody,
  sendErrorResponse,
  sendJsonResponse,
} from "../util-request";
import { batchUpsertCsvRows, upsertCsvRow, deleteCsvRow } from "../util-csv";
import { EDITION_API_PATH, EditionRequestBody } from "../../common/api";
import { logError, logInfo } from "../logger";

function compressRanges(numbers: number[]): string[] {
  if (!numbers.length) return [];

  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const ranges: string[] = [];

  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const curr = sorted[i];
    if (curr !== prev + 1) {
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = curr;
    }
    prev = curr;
  }

  return ranges;
}

const upsertEdition = (edition: EditionRequestBody, user: string): void => {
  logInfo("Starting edition upsert", {
    key: edition.key,
    user,
    isManuscript: edition.isManuscript,
    isElements: edition.isElements,
    verified: edition.verified,
  });

  if (edition.isManuscript) {
    logInfo("Processing manuscript edition", { key: edition.key });
    updateManuscriptCsvs(edition);
  } else {
    logInfo("Processing print edition", { key: edition.key });
    updatePrintCsvs(edition);
  }

  updateShelfmarks(edition);
  updateTranslations(edition);
  updateCorpuses(edition);

  if (edition.verified) {
    logInfo("Creating review record for verified edition", {
      key: edition.key,
      user,
    });
    upsertCsvRow(CSV_PATH_REVIEWS, edition.key, {
      key: edition.key,
      researcher: user,
      timestamp: new Date().toISOString(),
    } satisfies Review);
  }

  logInfo("Edition upsert completed", { key: edition.key });
};

const updateManuscriptCsvs = (edition: EditionRequestBody): void => {
  if (!edition.isManuscript) {
    return;
  }

  const itemsData: ManuscriptDetails = {
    key: edition.key,
    short_title: edition.shortTitle,
    short_title_source: edition.shortTitleSource,
    year_from: edition.manuscriptYearFrom?.toString(),
    year_to: edition.manuscriptYearTo?.toString(),
    notes: edition.notes,
  };

  upsertCsvRow(CSV_PATH_ITEMS_MANUSCRIPT, edition.key, itemsData);

  if (edition.isElements) {
    const metadataData: ManuscriptElementsMetadata = {
      key: edition.key,
      class: edition.manuscriptClass,
      subclass: edition.manuscriptSubclass,
      elements_books: compressRanges(edition.books).join(", "),
    };
    upsertCsvRow(CSV_PATH_MD_MANUSCRIPT, edition.key, metadataData);
  }
};

const updatePrintCsvs = (edition: EditionRequestBody): void => {
  if (edition.isManuscript) {
    return;
  }

  const itemsData: PrintDetails = {
    key: edition.key,
    city: edition.cities.join(", "),
    short_title: edition.shortTitle,
    short_title_source: edition.shortTitleSource,
    year: edition.year,
    language: edition.languages.map((l) => l.toUpperCase()).join(", "),
    author_or_editor: edition.editor.join(", "),
    publisher: edition.publisher.join(", "),
    format: edition.format?.toString() || null,
    volumes: edition.volumes?.toString() || null,
    ustc_id: edition.ustcId,
    notes: edition.notes,
  };

  upsertCsvRow(CSV_PATH_ITEMS_PRINT, edition.key, itemsData);

  if (edition.isElements) {
    const metadataData: PrintElementsMetadata = {
      key: edition.key,
      elements_books: compressRanges(edition.books).join(", "),
      additional_content: edition.additionalContent?.join(", "),
      wardhaugh_classification: null,
    };
    upsertCsvRow(CSV_PATH_MD_PRINT, edition.key, metadataData);
  }

  const paratextData: ParatextTranscriptions = {
    key: edition.key,
    colophon: edition.colophon,
    frontispiece: edition.frontispiece,
    imprint: edition.imprint,
    title: edition.title,
  };

  upsertCsvRow(CSV_PATH_TRANSCRIPTIONS, edition.key, paratextData);
};

const updateShelfmarks = (edition: EditionRequestBody): void => {
  const shelfmarkRows: Shelfmarks[] = edition.shelfmarks.map((shelfmark) => ({
    key: edition.key,
    volume: shelfmark.volume ? shelfmark.volume.toString() : null,
    scan: shelfmark.scan,
    title_page_img: shelfmark.title_page_img,
    frontispiece_img: shelfmark.frontispiece_img,
    annotations: shelfmark.annotations,
    shelf_mark: shelfmark.shelfmark,
    copyright: shelfmark.copyright,
  }));
  batchUpsertCsvRows(CSV_PATH_SHELFMARKS, shelfmarkRows);
};

const updateTranslations = (edition: EditionRequestBody): void => {
  if (edition.isManuscript) {
    return;
  }

  const translationFields = [
    { field: "title", value: edition.title_EN },
    { field: "imprint", value: edition.imprint_EN },
    { field: "colophon", value: edition.colophon_EN },
    { field: "frontispiece", value: edition.frontispiece_EN },
  ];

  const translationRows = translationFields
    .filter(({ value }) => value)
    .map(({ field, value }) => ({
      key: edition.key,
      field,
      en: value,
      source: edition.shortTitleSource,
    }));

  if (translationRows.length > 0) {
    batchUpsertCsvRows(CSV_PATH_TRANSLATIONS, translationRows);
  }
};

const updateCorpuses = (edition: EditionRequestBody): void => {
  upsertCsvRow(CSV_PATH_CORPUSES, edition.key, {
    key: edition.key,
    study: edition.corpus.join(", "),
  } satisfies StudyCorpuses);
};

const deleteEdition = (key: string): void => {
  logInfo("Starting edition deletion", { key });

  deleteCsvRow(CSV_PATH_ITEMS_MANUSCRIPT, key);
  deleteCsvRow(CSV_PATH_ITEMS_PRINT, key);
  deleteCsvRow(CSV_PATH_MD_MANUSCRIPT, key);
  deleteCsvRow(CSV_PATH_MD_PRINT, key);
  deleteCsvRow(CSV_PATH_REVIEWS, key);
  deleteCsvRow(CSV_PATH_SHELFMARKS, key);
  deleteCsvRow(CSV_PATH_TRANSCRIPTIONS, key);
  deleteCsvRow(CSV_PATH_TRANSLATIONS, key);
  deleteCsvRow(CSV_PATH_CORPUSES, key);

  logInfo("Edition deletion completed", { key });
};

export const isEditionRequest = (req: IncomingMessage): boolean => {
  return req.url === EDITION_API_PATH;
};

export const handleEditionRequest = async (
  user: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  const startTime = Date.now();
  logInfo("Processing edition request", {
    url: req.url,
    method: req.method,
    user,
  });

  try {
    if (req.method === "DELETE") {
      const { key } = await parseRequestBody<{ key: string }>(req);
      logInfo("Parsed edition deletion request", {
        key,
        user,
      });

      deleteEdition(key);

      const duration = Date.now() - startTime;
      logInfo("Edition deletion completed successfully", {
        key,
        user,
        duration: `${duration}ms`,
        responseStatus: 200,
      });

      sendJsonResponse(res, 200, { success: true, key });
    } else {
      const edition = await parseRequestBody<EditionRequestBody>(req);
      logInfo("Parsed edition request body", {
        user,
        edition,
      });

      upsertEdition(edition, user);

      const duration = Date.now() - startTime;
      logInfo("Edition request completed successfully", {
        key: edition.key,
        user,
        duration: `${duration}ms`,
        responseStatus: 201,
      });

      sendJsonResponse(res, 201, { success: true, key: edition.key });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const duration = Date.now() - startTime;

    logError("Edition request failed", {
      error: message,
      user,
      url: req.url,
      duration: `${duration}ms`,
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (message.includes("already exists")) {
      sendErrorResponse(res, 409, message);
    } else if (message.includes("not found")) {
      sendErrorResponse(res, 404, message);
    } else {
      const errorType = req.method === "DELETE" ? "deleting" : "creating";
      sendErrorResponse(res, 500, `Error ${errorType} edition: ${message}`);
    }
  }
};
