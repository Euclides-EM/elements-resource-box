import { Feature, FLOATING_CITY_ENTRY, Item } from "../types";
import {
  City,
  CSV_PATH_CITIES,
  CSV_PATH_CORPUSES,
  CSV_PATH_DOTTED_LINES,
  CSV_PATH_ITEMS_PRINT,
  CSV_PATH_MD_PRINT,
  CSV_PATH_SHELFMARKS,
  CSV_PATH_TITLE_PAGE_FEATURES,
  CSV_PATH_TRANSCRIPTIONS,
  CSV_PATH_TRANSLATIONS,
  DottedLine,
  ParatextTranscriptions,
  ParatextTranslations,
  PrintDetails,
  PrintElementsMetadata,
  Shelfmarks,
  StudyCorpuses,
} from "../../common/csv.ts";
import { groupBy, isEmpty, startCase, uniq } from "lodash";
import { Dispatch, SetStateAction } from "react";
import { FeaturesToSplit, FeatureToColumnName, ItemTypes } from "../constants";
import { Point } from "react-simple-maps";
import {
  BookStatementRef,
  parseBookStatementRef,
  toDisplay,
} from "../types/book_statement_ref.ts";
import { groupByMap } from "./util.ts";
import { fetchDiagramDirectories } from "./diagrams.ts";
import {
  mapOtherName,
  parseBooks,
  parseExplicitLanguages,
  parseInstitutions,
  parseOtherNames,
} from "./normalizeNames.ts";
import { loadAndParseCsv } from "./csv.ts";

const ifEmpty = <T>(arr: T[], defaultValue: T[]): T[] =>
  arr.length === 0 ? defaultValue : arr;

const firstOrNull = <T>(arr: T[]): T | null => (arr.length > 0 ? arr[0] : null);

const toYesNo = (value: string): "Yes" | "No" => {
  return value === "True" ? "Yes" : "No";
};

function mapStudyCorpus(s: string): string {
  switch (s) {
    case "dh":
      return "DH core texts";
  }
  return startCase(s.toLowerCase());
}

function parseStudyCorpora(
  printDetails: PrintDetails,
  corpuses: StudyCorpuses | undefined,
  paratext: ParatextTranscriptions,
): string[] {
  const studyCorpora: string[] =
    corpuses?.study
      ?.split(", ")
      .map((study: string): string => mapStudyCorpus(study))
      .filter(Boolean) || [];
  if (
    (!Number(printDetails.year) || Number(printDetails.year) <= 1700) &&
    corpuses?.study.includes("origin_eip_csv") &&
    printDetails.language !== "CHINESE" &&
    paratext.title &&
    paratext.title !== "?"
  ) {
    studyCorpora.push("Title pages");
  }
  return studyCorpora;
}

const groupByKey = <T extends { key: string }>(raw: T[]): Record<string, T> => {
  return groupByMap(raw, (item) => item["key"] as string);
};

const groupByKeyMany = <T extends { key: string }>(
  raw: T[],
): Record<string, T[]> => {
  return groupBy(raw, (item) => item["key"] as string);
};

export const loadEditionsData = (
  setItems: Dispatch<SetStateAction<Item[]>>,
  setFloatingCity = false,
) => {
  Promise.all([
    loadAndParseCsv<PrintDetails>(CSV_PATH_ITEMS_PRINT),
    loadAndParseCsv<PrintElementsMetadata>(CSV_PATH_MD_PRINT),
    loadAndParseCsv<ParatextTranscriptions>(CSV_PATH_TRANSCRIPTIONS),
    loadAndParseCsv<StudyCorpuses>(CSV_PATH_CORPUSES),
    loadAndParseCsv(CSV_PATH_TITLE_PAGE_FEATURES),
    loadAndParseCsv<ParatextTranslations>(CSV_PATH_TRANSLATIONS),
    loadAndParseCsv<Shelfmarks>(CSV_PATH_SHELFMARKS),
    fetchDiagramDirectories(),
    loadDottedLinesAsync(),
  ])
    .then(
      ([
        printItems,
        elementsMetadata,
        transcriptions,
        corpuses,
        tpFeatures,
        translations,
        shelfmarks,
        diagramDirectories,
        dottedLinesMap,
      ]) => {
        const elementsMetadataByKey = groupByKey(elementsMetadata);
        const transcriptionsByKey = groupByKey(transcriptions);
        const corpusesByKey = groupByKey(corpuses);
        const tpFeaturesByKey = groupByKey(tpFeatures);
        const translationsByKey = groupByKeyMany(translations);
        const shelfmarksByKey = groupByKeyMany(shelfmarks);
        return printItems
          .filter((i) => i.key)
          .map((printDetails) => {
            const key = printDetails.key;
            const metadata = elementsMetadataByKey[key] || {};
            const corpus = corpusesByKey[key];
            const transcription = transcriptionsByKey[key] || {};
            const tpFeatures = tpFeaturesByKey[key] || {};
            const translations = groupByMap(
              translationsByKey[key] || ([] as ParatextTranslations[]),
              (t) => t.field,
            );
            const shelfmarks = shelfmarksByKey[key] || [];
            const hasTitle =
              Boolean(transcription.title) && transcription.title !== "?";
            const hasTitleImage =
              Boolean(shelfmarks.some((s) => s.title_page_img)) && hasTitle;
            const type =
              corpus?.study.includes("origin_eip_csv") ||
              elementsMetadataByKey[key]
                ? ItemTypes.elements
                : ItemTypes.secondary;
            return {
              key,
              year: printDetails.year,
              cities: ifEmpty(
                printDetails.city
                  ?.split(",")
                  .map((c) => c.trim())
                  .filter(Boolean) || [],
                setFloatingCity ? [FLOATING_CITY_ENTRY.city] : [],
              ),
              languages: printDetails.language
                .split(",")
                .map((lang) => startCase(lang.trim().toLowerCase()))
                .filter(Boolean),
              authors:
                printDetails.author_or_editor
                  ?.split(",")
                  .map((name) => name.trim()) || [],
              imageUrl:
                firstOrNull(
                  shelfmarks.map((s) => s.title_page_img).filter(Boolean),
                ) ||
                firstOrNull(
                  shelfmarks.map((s) => s.frontispiece_img).filter(Boolean),
                ),
              title: transcription.title,
              titleEn: translations.title?.en,
              imprint: transcription.imprint,
              imprintEn: translations.imprint?.en,
              scanUrl: shelfmarks
                .map((s) => s.scan?.trim())
                .filter(Boolean) as string[],
              type,
              format: printDetails.format,
              ...parseBooks(metadata.elements_books),
              additionalContent:
                metadata.additional_content
                  ?.split(", ")
                  .map((s) => s.trim())
                  .filter(Boolean) || [],
              volumesCount: printDetails.volumes
                ? parseInt(printDetails.volumes)
                : null,
              class: metadata.wardhaugh_classification,
              hasTitle:
                shelfmarks.some((s) => s.title_page_img) &&
                Boolean(transcription.title) &&
                transcription.title !== "?"
                  ? "Yes, based on digital facsimile"
                  : Boolean(transcription.title) && transcription.title !== "?"
                    ? "Yes, based on catalog long title"
                    : transcription.title !== "?"
                      ? "No"
                      : "Unknown",

              study_corpora: parseStudyCorpora(
                printDetails,
                corpus,
                transcription,
              ),
              tp_illustration: tpFeatures["illustration"]
                ? "Yes"
                : "No or uncatalogued",
              colorInTitle: hasTitleImage
                ? tpFeatures["red_ink"] === "True"
                  ? "Black and Red"
                  : "Black"
                : null,
              titlePageDesign: hasTitleImage
                ? startCase(tpFeatures["print_technique"]?.toLowerCase())
                : null,
              titlePageNumberOfTypes: hasTitleImage
                ? tpFeatures["number_of_types"]
                  ? parseInt(tpFeatures["number_of_types"] as string)
                  : null
                : null,
              titlePageFrameType: hasTitleImage
                ? startCase(
                    (tpFeatures["frame_type"] as string | null)?.toLowerCase(),
                  )
                : null,
              titlePageEngraving: hasTitleImage
                ? startCase(
                    (tpFeatures["engraving"] as string | null)?.toLowerCase(),
                  )
                : null,
              hasPrintersDevice: hasTitleImage
                ? toYesNo(tpFeatures["printer_device"] as string)
                : null,
              fontTypes: hasTitleImage
                ? (tpFeatures["font_types"] as string | null)
                    ?.split(", ")
                    .map((type) => startCase(type.toLowerCase()))
                    .filter(Boolean) || []
                : [],
              calligraphicFeatures: hasTitleImage
                ? startCase(
                    (
                      tpFeatures["calligraphic_features"] as string | null
                    )?.toLowerCase(),
                  )
                : null,
              notes: printDetails.notes,
              otherNamesClassification: hasTitle
                ? ((tpFeatures["other_names_classification"] as string | null)
                    ?.split(", ")
                    .map((s) => mapOtherName(s))
                    .concat(
                      tpFeatures["references_to_Euclid"] ? ["Euclid"] : [],
                    )
                    .filter(Boolean) ?? [])
                : null,
              hasIntendedAudience: hasTitle
                ? tpFeatures["audience"]
                  ? ("Yes" as const)
                  : ("No" as const)
                : null,
              hasPatronageDedication: hasTitle
                ? tpFeatures["dedicatee_name"] ||
                  tpFeatures["dedication_in_imprint"]
                  ? ("Yes" as const)
                  : ("No" as const)
                : null,
              hasAdapterAttribution: hasTitle
                ? tpFeatures["editor_name"]
                  ? ("Yes" as const)
                  : ("No" as const)
                : null,
              hasPublishingPrivileges: hasTitle
                ? tpFeatures["printing_privilege"] ||
                  tpFeatures["printing_privilege_in_imprint"]
                  ? ("Yes" as const)
                  : ("No" as const)
                : null,
              hasGreekDesignation: hasTitle
                ? tpFeatures["Greek_text"]
                  ? ("Yes" as const)
                  : ("No" as const)
                : null,
              explicitLanguageReferences: hasTitle
                ? parseExplicitLanguages(
                    `${tpFeatures["origin_language"] || ""}, ${tpFeatures["destination_language"] || ""}`,
                  )
                : null,
              institutions: hasTitle
                ? parseInstitutions(tpFeatures["institutions"] || "")
                : null,
              otherNames: hasTitle
                ? parseOtherNames(
                    tpFeatures["educational_authorities_references"] || "",
                  )
                : null,
              features: Object.keys(FeatureToColumnName).reduce(
                (acc, feature) => {
                  acc[feature as Feature] = FeatureToColumnName[
                    feature as Feature
                  ]
                    .filter((column) => !!tpFeatures[column])
                    .map((column) => tpFeatures[column] as string)
                    .flatMap((text) =>
                      FeaturesToSplit[feature as Feature]
                        ? uniq(text.split(", "))
                        : text.split("::"),
                    )
                    .map((t) => t.trim());
                  if (feature === "Elements Designation") {
                    acc[feature as Feature] =
                      !tpFeatures["Elements_designation"] && type === "elements"
                        ? [tpFeatures["base_content"] as string]
                        : tpFeatures["Elements_designation"] === "none" &&
                            type === "elements"
                          ? []
                          : acc[feature as Feature];
                  }
                  return acc;
                },
                {} as Partial<Record<Feature, string[]>>,
              ),
              diagrams_extracted: startCase(
                diagramDirectories.has(key).toString(),
              ),
              has_diagrams:
                startCase(dottedLinesMap[key]?.hasDiagrams.toString()) ||
                "Uncatalogued",
              dotted_lines_cases: dottedLinesMap[key]?.all.map(toDisplay) || [
                "Uncatalogued",
              ],
              dotted_lines_b79_cases: startCase(
                dottedLinesMap[key]?.hasBook7To9Token.toString(),
              ),
              dotted_lines_b10_case: startCase(
                dottedLinesMap[key]?.hasBook10Dotted.toString(),
              ),
              dotted_lines_b2_cases:
                dottedLinesMap[key]?.book2Cases.map(toDisplay) || [],
              dotted_lines_geo_cases:
                dottedLinesMap[key]?.geoCases.map(toDisplay) || [],
              dotted_lines_other_cases:
                dottedLinesMap[key]?.otherCases.map(toDisplay) || [],
            } satisfies Item;
          });
      },
    )
    .then((allItems) => {
      setItems(
        allItems.sort(
          (a, b) =>
            (a.year || "").localeCompare(b.year || "") ||
            a.key.localeCompare(b.key),
        ),
      );
    })
    .catch((error) => console.error("Error reading CSVs:", error));
};

export const loadCitiesAsync = async (): Promise<Record<string, Point>> => {
  // @ts-expect-error no key...
  const cities = await loadAndParseCsv<City>(CSV_PATH_CITIES);
  cities.push(FLOATING_CITY_ENTRY);
  return groupByMap(
    cities,
    (city) => city.city,
    (city) => [city.lon, city.lat],
  );
};

const loadDottedLinesAsync = async (): Promise<
  Record<
    string,
    {
      hasDiagrams: boolean;
      hasBook7To9Token: boolean;
      hasBook10Dotted: boolean;
      book2Cases: BookStatementRef[];
      geoCases: BookStatementRef[];
      otherCases: BookStatementRef[];
      all: BookStatementRef[];
    }
  >
> => {
  const dottedLines = await loadAndParseCsv<DottedLine>(CSV_PATH_DOTTED_LINES);

  return groupByMap(
    dottedLines,
    (line) => line.key,
    (line) => {
      const hasDiagrams = !isEmpty(line.has_diagrams);
      const hasBook7To9Token = !isEmpty(line.uc_b79_token);
      const hasBook10Dotted = !isEmpty(line.uc_b10);
      const book2Cases =
        line.uc_b2?.split(", ").map(parseBookStatementRef) || [];
      const geoCases =
        line.uc_geo_dotted?.split(", ").map(parseBookStatementRef) || [];
      const otherCases =
        line.uc_other?.split(", ").map(parseBookStatementRef) || [];
      const all =
        [...book2Cases, ...geoCases, ...otherCases].filter(Boolean) || [];
      if (hasBook7To9Token) {
        all.unshift(parseBookStatementRef("b79"));
      }
      if (hasBook10Dotted) {
        all.unshift(parseBookStatementRef("b10"));
      }

      return {
        hasDiagrams,
        hasBook7To9Token,
        hasBook10Dotted,
        book2Cases,
        geoCases,
        otherCases,
        all,
      };
    },
  );
};

export const authorDisplayName = (author: string) => {
  author = author.replace("(?)", "").replace("?", "").trim();
  const parts = author.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return author;

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
  return window.open(item.imageUrl!, "_blank")?.focus();
}
