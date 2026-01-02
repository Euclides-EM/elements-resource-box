import type { IncomingMessage, ServerResponse } from "http";
import {
  BibliographyEntry,
  ClusterEntry,
  ClusterItem,
  CSV_PATH_BIBLIOGRAPHY,
  CSV_PATH_CLUSTER_ITEMS,
  CSV_PATH_CLUSTERS,
  CSV_PATH_CORPUSES,
  CSV_PATH_ITEMS_MANUSCRIPT,
  CSV_PATH_ITEMS_PRINT,
  CSV_PATH_LOCATORS,
  CSV_PATH_MD_MANUSCRIPT,
  CSV_PATH_MD_PRINT,
  CSV_PATH_REVIEWS,
  CSV_PATH_SHELFMARKS,
  CSV_PATH_TRANSCRIPTIONS,
  CSV_PATH_TRANSLATIONS,
  CSV_PATH_VISUAL_ELEMENTS,
  CSV_PATH_VISUAL_ELEMENTS_EXAMPLES,
  Locator,
  ManuscriptDetails,
  ManuscriptElementsMetadata,
  ParatextTranscriptions,
  PrintDetails,
  PrintElementsMetadata,
  Review,
  Shelfmarks,
  StudyCorpuses,
  VisualElement,
  VisualElementExample,
} from "../../common/csv";
import {
  parseRequestBody,
  sendErrorResponse,
  sendJsonResponse,
} from "../util-request";
import {
  batchUpsertCsvRows,
  upsertCsvRow,
  deleteCsvRow,
  loadCsvData,
  saveCsvData,
} from "../util-csv";
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
  updateBibliography(edition);
  updateClusters(edition);
  updateVisualElements(edition);

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
    has_diagrams: null,
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
    has_diagrams: null,
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

  const parsed = loadCsvData<Shelfmarks>(CSV_PATH_SHELFMARKS);
  const existingRows = parsed.filter((row) => row.key === edition.key);

  const hasChanges =
    shelfmarkRows.length !== existingRows.length ||
    shelfmarkRows.some((newRow, index) => {
      const existingRow = existingRows[index];
      if (!existingRow) return true;
      return Object.keys(newRow).some((key) => {
        const newVal = newRow[key as keyof Shelfmarks];
        const existingVal = existingRow[key as keyof Shelfmarks];
        return newVal !== existingVal;
      });
    });

  if (!hasChanges) {
    return;
  }

  const firstIndex = parsed.findIndex((row) => row.key === edition.key);
  const updatedData: Shelfmarks[] = [];

  if (firstIndex === -1) {
    updatedData.push(...parsed, ...shelfmarkRows);
  } else {
    let replacementDone = false;
    for (let i = 0; i < parsed.length; i++) {
      if (parsed[i].key === edition.key) {
        if (!replacementDone) {
          updatedData.push(...shelfmarkRows);
          replacementDone = true;
        }
      } else {
        updatedData.push(parsed[i]);
      }
    }
  }

  saveCsvData(CSV_PATH_SHELFMARKS, updatedData);
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
      source: null,
    }));

  if (translationRows.length > 0) {
    batchUpsertCsvRows(CSV_PATH_TRANSLATIONS, translationRows);
  }
};

const updateCorpuses = (edition: EditionRequestBody): void => {
  if (edition.corpus.length === 0) {
    return;
  }

  upsertCsvRow(CSV_PATH_CORPUSES, edition.key, {
    key: edition.key,
    study: edition.corpus.join(", "),
  } satisfies StudyCorpuses);
};

const updateBibliography = (edition: EditionRequestBody): void => {
  const bibliographyRows: BibliographyEntry[] = edition.bibliography.map(
    (citation) => ({
      key: edition.key,
      citation,
    }),
  );

  const parsed = loadCsvData<BibliographyEntry>(CSV_PATH_BIBLIOGRAPHY);
  const existingRows = parsed.filter((row) => row.key === edition.key);

  const hasChanges =
    bibliographyRows.length !== existingRows.length ||
    bibliographyRows.some((newRow, index) => {
      const existingRow = existingRows[index];
      if (!existingRow) return true;
      return newRow.citation !== existingRow.citation;
    });

  if (!hasChanges) {
    return;
  }

  const firstIndex = parsed.findIndex((row) => row.key === edition.key);
  const updatedData: BibliographyEntry[] = [];

  if (firstIndex === -1) {
    updatedData.push(...parsed, ...bibliographyRows);
  } else {
    let replacementDone = false;
    for (let i = 0; i < parsed.length; i++) {
      if (parsed[i].key === edition.key) {
        if (!replacementDone) {
          updatedData.push(...bibliographyRows);
          replacementDone = true;
        }
      } else {
        updatedData.push(parsed[i]);
      }
    }
  }

  saveCsvData(CSV_PATH_BIBLIOGRAPHY, updatedData);
};

const updateClusters = (edition: EditionRequestBody): void => {
  if (!edition.reprintOf) {
    return;
  }

  logInfo("Processing reprint cluster", {
    key: edition.key,
    reprintOf: edition.reprintOf,
  });

  const clusterItems = loadCsvData<ClusterItem>(CSV_PATH_CLUSTER_ITEMS);

  const parentCluster = clusterItems.find(
    (ci) => ci.item_key === edition.reprintOf,
  );

  if (parentCluster) {
    const clusterKey = parentCluster.cluster_key;
    logInfo("Found existing cluster for parent item", {
      key: edition.key,
      reprintOf: edition.reprintOf,
      clusterKey,
    });

    const existingClusterItem = clusterItems.find(
      (ci) => ci.item_key === edition.key,
    );

    if (!existingClusterItem) {
      const newClusterItem: ClusterItem = {
        cluster_key: clusterKey,
        item_key: edition.key,
      };

      logInfo("Adding item to existing cluster", {
        key: edition.key,
        clusterKey,
      });

      upsertCsvRow(
        CSV_PATH_CLUSTER_ITEMS,
        `${clusterKey}_${edition.key}`,
        newClusterItem,
      );
    }
  } else {
    const newClusterKey = Math.random().toString(36).slice(2, 8).toUpperCase();

    logInfo("Creating new cluster", {
      key: edition.key,
      reprintOf: edition.reprintOf,
      newClusterKey,
    });

    const newCluster: ClusterEntry = {
      key: newClusterKey,
      type: "reprint",
    };

    const parentClusterItem: ClusterItem = {
      cluster_key: newClusterKey,
      item_key: edition.reprintOf,
    };

    const currentClusterItem: ClusterItem = {
      cluster_key: newClusterKey,
      item_key: edition.key,
    };

    upsertCsvRow(CSV_PATH_CLUSTERS, newClusterKey, newCluster);
    upsertCsvRow(
      CSV_PATH_CLUSTER_ITEMS,
      `${newClusterKey}_${edition.reprintOf}`,
      parentClusterItem,
    );
    upsertCsvRow(
      CSV_PATH_CLUSTER_ITEMS,
      `${newClusterKey}_${edition.key}`,
      currentClusterItem,
    );
  }
};

const updateVisualElements = (edition: EditionRequestBody): void => {
  if (!edition.visualElements || edition.visualElements.length === 0) {
    return;
  }

  logInfo("Processing visual elements", {
    key: edition.key,
    count: edition.visualElements.length,
  });

  // Create a map to track locators that need to be created
  const newLocators: Map<string, Locator> = new Map();

  // Process visual elements and collect locators
  const visualElementRows: VisualElement[] = [];
  const exampleRows: VisualElementExample[] = [];

  for (const ve of edition.visualElements) {
    // Handle locator if it exists
    let locatorKey: string | null = null;
    if (ve.locator) {
      locatorKey = ve.locator.key;
      newLocators.set(locatorKey, ve.locator);
    }

    // Create visual element row
    visualElementRows.push({
      key: edition.key,
      visual_element_type: ve.visual_element_type,
      locator_type: ve.locator_type,
      locator_key: locatorKey,
      notes: ve.notes || null,
    });

    // Create example rows
    for (const example of ve.examples) {
      let exampleLocatorKey: string | null = null;
      if (example.locator) {
        exampleLocatorKey = example.locator.key;
        newLocators.set(exampleLocatorKey, example.locator);
      }

      exampleRows.push({
        key: edition.key,
        path: example.img,
        locator_key: exampleLocatorKey,
      });
    }
  }

  // Update locators CSV
  if (newLocators.size > 0) {
    const locatorRows = Array.from(newLocators.values());
    batchUpsertCsvRows(CSV_PATH_LOCATORS, locatorRows);
  }

  // Update visual elements CSV
  const parsed = loadCsvData<VisualElement>(CSV_PATH_VISUAL_ELEMENTS);
  const existingRows = parsed.filter((row) => row.key === edition.key);

  const hasChanges =
    visualElementRows.length !== existingRows.length ||
    visualElementRows.some((newRow, index) => {
      const existingRow = existingRows[index];
      if (!existingRow) return true;
      return Object.keys(newRow).some((key) => {
        const newVal = newRow[key as keyof VisualElement];
        const existingVal = existingRow[key as keyof VisualElement];
        return newVal !== existingVal;
      });
    });

  if (hasChanges) {
    const firstIndex = parsed.findIndex((row) => row.key === edition.key);
    const updatedData: VisualElement[] = [];

    if (firstIndex === -1) {
      updatedData.push(...parsed, ...visualElementRows);
    } else {
      let replacementDone = false;
      for (let i = 0; i < parsed.length; i++) {
        if (parsed[i].key === edition.key) {
          if (!replacementDone) {
            updatedData.push(...visualElementRows);
            replacementDone = true;
          }
        } else {
          updatedData.push(parsed[i]);
        }
      }
    }

    saveCsvData(CSV_PATH_VISUAL_ELEMENTS, updatedData);
  }

  // Update visual element examples CSV
  if (exampleRows.length > 0) {
    const examplesParsed = loadCsvData<VisualElementExample>(
      CSV_PATH_VISUAL_ELEMENTS_EXAMPLES,
    );

    // Remove existing examples for this edition's visual elements
    const visualElementKeys = edition.visualElements.map((ve) => ve.key);
    const filteredExamples = examplesParsed.filter(
      (row) => !visualElementKeys.includes(row.key),
    );

    const updatedExamplesData = [...filteredExamples, ...exampleRows];
    saveCsvData(CSV_PATH_VISUAL_ELEMENTS_EXAMPLES, updatedExamplesData);
  }
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
  deleteCsvRow(CSV_PATH_BIBLIOGRAPHY, key);
  deleteCsvRow(CSV_PATH_CLUSTER_ITEMS, key);
  deleteCsvRow(CSV_PATH_VISUAL_ELEMENTS, key);
  deleteCsvRow(CSV_PATH_VISUAL_ELEMENTS_EXAMPLES, key);
  deleteCsvRow(CSV_PATH_LOCATORS, key);

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
