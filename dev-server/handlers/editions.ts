import type { IncomingMessage, ServerResponse } from "http";
import {
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
} from "../../common/csv";
import {
  parseRequestBody,
  sendErrorResponse,
  sendJsonResponse,
} from "../util-request";
import { appendCsvRow, upsertCsvRow } from "../util-csv";
import { EDITION_API_PATH, EditionRequestBody } from "../../common/api";

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
  if (edition.isManuscript) {
    updateManuscriptCsvs(edition);
  } else {
    updatePrintCsvs(edition);
  }

  updateShelfmarks(edition);
  updateTranslations(edition);

  if (edition.verified) {
    upsertCsvRow(CSV_PATH_REVIEWS, edition.key, {
      key: edition.key,
      researcher: user,
      timestamp: new Date().toISOString(),
    } satisfies Review);
  }
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
  edition.shelfmarks.forEach((shelfmark) => {
    const shelfmarkData: Shelfmarks = {
      key: edition.key,
      volume: shelfmark.volume ? shelfmark.volume.toString() : null,
      scan: shelfmark.scan,
      title_page_img: shelfmark.title_page_img,
      frontispiece_img: shelfmark.frontispiece_img,
      annotations: shelfmark.annotations,
      shelf_mark: shelfmark.shelfmark,
      copyright: shelfmark.copyright,
    };
    appendCsvRow(CSV_PATH_SHELFMARKS, shelfmarkData);
  });
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

  translationFields.forEach(({ field, value }) => {
    if (value) {
      const translationData = {
        field,
        en: value,
        source: edition.shortTitleSource,
      };
      appendCsvRow(CSV_PATH_TRANSLATIONS, translationData);
    }
  });
};

export const isEditionRequest = (req: IncomingMessage): boolean => {
  return req.method === "POST" && req.url === EDITION_API_PATH;
};

export const handleEditionRequest = async (
  user: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  try {
    const edition = await parseRequestBody<EditionRequestBody>(req);
    upsertEdition(edition, user);
    sendJsonResponse(res, 201, { success: true, key: edition.key });
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
