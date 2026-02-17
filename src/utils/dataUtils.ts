import { FLOATING_CITY_ENTRY, Item } from "../types";
import { startCase, uniq } from "lodash";
import { Dispatch, SetStateAction } from "react";
import { ItemTypes } from "../constants";
import { Point } from "react-simple-maps";
import { listAllEditions } from "../api/editionApi.ts";
import { fetchDiagramDirectories } from "../api/diagramsApi.ts";
import type { model_Edition } from "../../hub-api";
import { toItemImageUrl } from "./util.ts";

const ifEmpty = <T>(arr: T[], defaultValue: T[]): T[] =>
  arr.length === 0 ? defaultValue : arr;

const firstOrNull = <T>(arr: T[]): T | null => (arr.length > 0 ? arr[0] : null);

function mapStudyCorpus(s: string): string {
  switch (s) {
    case "dh":
      return "DH core texts";
    case "dotted_lines":
      return "Dotted Lines";
  }
  return startCase(s.toLowerCase());
}

const toFormat = (value: number | undefined): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  return `${value}º`;
};

export const mapEditionsToItems = (
  editions: model_Edition[],
  diagramDirectories: Set<string>,
  setFloatingCity = false,
  sortByYear = true,
): Item[] => {
  const mapped = editions
    .filter((edition) => edition.key)
    .map((edition) => {
      const cities = ifEmpty(
        (edition.cities || []).map((c) => c.trim()).filter(Boolean),
        setFloatingCity ? [FLOATING_CITY_ENTRY.city] : [],
      );
      const shelfmarks = edition.shelfmarks || [];
      const books = (edition.books || []).filter((value): value is number =>
        Number.isFinite(value),
      );
      const hasTitle = Boolean(edition.title);
      const hasTitleImage = shelfmarks.some((s) => Boolean(s.title_page_img));
      const studyCorpora = (edition.corpus || [])
        .map((corpus) => mapStudyCorpus(corpus))
        .filter(Boolean);

      return {
        key: edition.key!,
        year: edition.year || null,
        cities,
        languages: (edition.languages || [])
          .map((lang) => startCase(lang.trim().toLowerCase()))
          .filter(Boolean),
        authors: (edition.editor || [])
          .map((name) => name.trim())
          .filter(Boolean),
        publishers: (edition.publisher || [])
          .map((name) => name.trim())
          .filter(Boolean),
        imageUrl:
          firstOrNull(
            shelfmarks.map((s) => s.title_page_img).filter(Boolean) as string[],
          ) ||
          firstOrNull(
            shelfmarks
              .map((s) => s.frontispiece_img)
              .filter(Boolean) as string[],
          ),
        shortTitle: edition.shortTitle || null,
        title: edition.title || null,
        titleEn: edition.title_EN || null,
        imprint: edition.imprint || null,
        imprintEn: edition.imprint_EN || null,
        scanUrl: shelfmarks
          .map((s) => s.scan?.trim())
          .filter(Boolean) as string[],
        type: edition.isElements ? ItemTypes.elements : ItemTypes.secondary,
        format: toFormat(edition.format),
        elementsBooks: books.map((book) => ({ start: book, end: book })),
        elementsBooksExpanded: books,
        additionalContent: edition.additionalContent || [],
        volumesCount: edition.volumes ?? null,
        class: edition.manuscriptClass || null,
        hasTitle: hasTitleImage
          ? "Yes, based on digital facsimile"
          : hasTitle
            ? "Yes, based on catalog long title"
            : "Unknown",
        study_corpora: uniq(studyCorpora),
        tp_illustration: "No or uncatalogued",
        colorInTitle: null,
        titlePageDesign: null,
        titlePageNumberOfTypes: null,
        titlePageFrameType: null,
        titlePageEngraving: null,
        hasPrintersDevice: null,
        fontTypes: [],
        calligraphicFeatures: null,
        notes: edition.notes || null,
        otherNamesClassification: null,
        hasIntendedAudience: null,
        hasPatronageDedication: null,
        hasAdapterAttribution: null,
        hasPublishingPrivileges: null,
        hasGreekDesignation: null,
        explicitLanguageReferences: null,
        institutions: null,
        otherNames: null,
        features: {},
        diagramsExtracted: diagramDirectories.has(edition.key!)
          ? "True"
          : "False",
        hasDiagrams: "Uncatalogued",
        visualElementsTypes: uniq(
          (edition.visualElements || [])
            .map((v) => v.visual_element_type)
            .filter(Boolean) as string[],
        ),
        dotted_lines_cases: ["Uncatalogued"],
        dotted_lines_b79_cases: "Unknown",
        dotted_lines_b10_case: "Unknown",
        dotted_lines_b2_cases: [],
        dotted_lines_geo_cases: [],
        dotted_lines_other_cases: [],
        reprintOf: edition.reprintOf || null,
      } satisfies Item;
    });

  if (!sortByYear) {
    return mapped;
  }

  return mapped.sort(
    (a, b) =>
      (a.year || "").localeCompare(b.year || "") || a.key.localeCompare(b.key),
  );
};

export const loadEditionsData = (
  setItems: Dispatch<SetStateAction<Item[]>>,
  setFloatingCity = false,
) => {
  Promise.all([listAllEditions(), fetchDiagramDirectories()])
    .then(([editions, diagramDirectories]) => {
      setItems(
        mapEditionsToItems(editions, diagramDirectories, setFloatingCity),
      );
    })
    .catch((error) => console.error("Error loading editions data:", error));
};

export const loadCitiesAsync = async (): Promise<Record<string, Point>> => {
  return {
    [FLOATING_CITY_ENTRY.city]: [
      FLOATING_CITY_ENTRY.lon,
      FLOATING_CITY_ENTRY.lat,
    ],
  };
};

export const authorDisplayName = (author: string) => {
  author = author.replace("(?)", "").replace("?", "").trim();
  const parts = author.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return author;
  }

  const separators = [
    "de",
    "la",
    "del",
    "della",
    "di",
    "da",
    "do",
    "dos",
    "das",
    "du",
    "van",
    "von",
    "der",
    "den",
    "ter",
    "ten",
    "op",
    "af",
    "al",
    "le",
    "el",
    "of",
    "lefèvre",
  ];
  const lowerParts = parts.map((p) => p.toLowerCase());

  let sepIndex = -1;
  for (let i = 1; i < lowerParts.length; i++) {
    if (separators.includes(lowerParts[i])) {
      sepIndex = i;
      break;
    }
  }

  if (sepIndex !== -1) {
    const lastName = parts.slice(sepIndex).join(" ").trim();
    const firstNames = parts.slice(0, sepIndex).join(" ").trim();
    return `${lastName}, ${firstNames}`;
  } else {
    const lastName = parts[parts.length - 1];
    const firstNames = parts.slice(0, -1).join(" ").trim();
    return `${lastName}, ${firstNames}`;
  }
};

export function openScan(item: Item) {
  if (!item.scanUrl || item.scanUrl.length === 0) {
    return;
  }
  return window.open(item.scanUrl[0], "_blank")?.focus();
}

export function openImage(item: Item) {
  const imageUrl = toItemImageUrl(item.imageUrl);
  if (!imageUrl) {
    return;
  }
  return window.open(imageUrl, "_blank")?.focus();
}
