import { useForm, useStore } from "@tanstack/react-form";
import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled from "@emotion/styled";
import { deleteEdition, upsertEdition, ustcLookup } from "../api/editionApi";
import type { model_Edition } from "../../hub-api";
import { AuthContext } from "../contexts/Auth.ts";
import { CATALOGUE_ROUTE } from "../components/layout/routes.ts";
import { isNil, startCase, uniq, uniqueId } from "lodash";
import {
  BibliographyEntry,
  City,
  ClusterEntry,
  ClusterItem,
  CSV_PATH_BIBLIOGRAPHY,
  CSV_PATH_CITIES,
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
  ParatextTranslations,
  PrintDetails,
  PrintElementsMetadata,
  Review,
  Shelfmarks,
  StudyCorpuses,
  VisualElement,
  VisualElementExample,
} from "../data/csvTypes.ts";
import { invalidateCsvCache, loadAndParseCsv } from "../utils/csv.ts";
import { parseBooks } from "../utils/normalizeNames.ts";
import MultiSelect from "../components/tps/filters/MultiSelect.tsx";
import SingleSelect from "../components/tps/filters/SingleSelect.tsx";
import { Row } from "../components/common.ts";
import { isValidUrl } from "../utils/util.ts";

type EditionFormData = {
  key: string;
  shortTitle: string;
  shortTitleSource: string;
  cities: string[];
  notes: string;
  corpus: string[];
  shelfmarks: {
    volume: number | null;
    scan: string | null;
    shelfmark: string | null;
    title_page_img: string | null;
    frontispiece_img: string | null;
    annotations: string | null;
    copyright: string | null;
  }[];
  verified: boolean;
  bibliography: string[];
  reprintOf: string | null;
  visualElements: {
    visual_element_type: string;
    notes: string;
    locator_type: string;
    locator: Locator | null;
    examples: {
      img: string;
      has_locator: boolean;
      locator: Locator | null;
    }[];
  }[];
  isManuscript: boolean;
  manuscriptYearFrom?: number;
  manuscriptYearTo?: number;
  manuscriptClass?: string;
  manuscriptSubclass?: string | null;
  year?: string | null;
  languages?: string[];
  editor?: string[];
  publisher?: string[];
  format?: number | null;
  volumes?: number | null;
  ustcId?: string | null;
  title?: string | null;
  title_EN?: string | null;
  imprint?: string | null;
  imprint_EN?: string | null;
  colophon?: string | null;
  colophon_EN?: string | null;
  frontispiece?: string | null;
  frontispiece_EN?: string | null;
  isElements: boolean;
  books?: number[];
  additionalContent?: string[];
};

function toModelEdition(data: EditionFormData): model_Edition {
  const nullToUndef = <T,>(v: T | null): T | undefined => v ?? undefined;
  return {
    key: data.key,
    shortTitle: data.shortTitle,
    shortTitleSource: data.shortTitleSource,
    cities: data.cities,
    notes: data.notes,
    corpus: data.corpus,
    shelfmarks: data.shelfmarks.map((s) => ({
      volume: nullToUndef(s.volume),
      scan: nullToUndef(s.scan),
      shelfmark: nullToUndef(s.shelfmark),
      title_page_img: nullToUndef(s.title_page_img),
      frontispiece_img: nullToUndef(s.frontispiece_img),
      annotations: nullToUndef(s.annotations),
      copyright: nullToUndef(s.copyright),
    })),
    verified: data.verified,
    bibliography: data.bibliography,
    reprintOf: nullToUndef(data.reprintOf),
    visualElements: data.visualElements.map((ve) => ({
      visual_element_type: ve.visual_element_type,
      notes: ve.notes,
      locator_type: ve.locator_type,
      locator: nullToUndef(ve.locator)
        ? {
            key: ve.locator!.key,
            first_order_type: nullToUndef(ve.locator!.first_order_type),
            first_order_value: nullToUndef(ve.locator!.first_order_value),
            type: nullToUndef(ve.locator!.type),
            value: ve.locator!.value,
            page_type: ve.locator!.page_type,
            page_value: nullToUndef(ve.locator!.page_value),
          }
        : undefined,
      examples: ve.examples.map((ex) => ({
        img: ex.img,
        has_locator: ex.has_locator,
        locator: nullToUndef(ex.locator)
          ? {
              key: ex.locator!.key,
              first_order_type: nullToUndef(ex.locator!.first_order_type),
              first_order_value: nullToUndef(ex.locator!.first_order_value),
              type: nullToUndef(ex.locator!.type),
              value: ex.locator!.value,
              page_type: ex.locator!.page_type,
              page_value: nullToUndef(ex.locator!.page_value),
            }
          : undefined,
      })),
    })),
    isManuscript: data.isManuscript,
    manuscriptYearFrom: data.manuscriptYearFrom,
    manuscriptYearTo: data.manuscriptYearTo,
    manuscriptClass: data.manuscriptClass,
    manuscriptSubclass: nullToUndef(data.manuscriptSubclass),
    year: nullToUndef(data.year),
    languages: data.languages,
    editor: data.editor,
    publisher: data.publisher,
    format: nullToUndef(data.format),
    volumes: nullToUndef(data.volumes),
    ustcId: nullToUndef(data.ustcId),
    title: nullToUndef(data.title),
    title_EN: nullToUndef(data.title_EN),
    imprint: nullToUndef(data.imprint),
    imprint_EN: nullToUndef(data.imprint_EN),
    colophon: nullToUndef(data.colophon),
    colophon_EN: nullToUndef(data.colophon_EN),
    frontispiece: nullToUndef(data.frontispiece),
    frontispiece_EN: nullToUndef(data.frontispiece_EN),
    isElements: data.isElements,
    books: data.books,
    additionalContent: data.additionalContent,
  };
}

const SHORT_TITLE_SOURCES = [
  "Specified in source",
  "Provided by catalog",
  "Invented by enterer",
];

const LANGUAGES = [
  "Arabic",
  "Chinese",
  "Dutch",
  "English",
  "French",
  "German",
  "Greek",
  "Italian",
  "Latin",
  "Portuguese",
  "Spanish",
  "Swedish",
];

const FORMATS = [
  "2º",
  "4º",
  "6º",
  "8º",
  "12º",
  "16º",
  "18º",
  "24º",
  "32º",
  "48º",
  "64º",
];

const STUDY_CORPUSES = [
  { name: "dh", label: "DH core" },
  { name: "tps", label: "Title pages" },
  { name: "dotted_lines", label: "Dotted lines" },
  { name: "Angela_metadata", label: "Angela metadata" },
  { name: "origin_eip_csv", label: "Original EiP" },
  { name: "axiomatics_16", label: "Axiomatics 16" },
];

const ANNOTATIONS = ["none", "a few", "some", "many", "uncatalogued"];

const PageContainer = styled.div`
  padding-right: 1rem;
  width: 100%;
  margin: 0 auto;
  max-width: 100vw;
  box-sizing: border-box;
  min-height: calc(100vh - 120px);
  background-color: aliceblue;
`;

const FormContainer = styled.div`
  width: 100%;
  padding: 1rem;
  padding-right: 0;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  overflow-x: auto;
  overscroll-behavior: auto;
  color: black;

  em {
    font-size: 0.875rem;
    color: #590000;
    background-color: #fad8d8;
    padding: 2px 4px;
    border-radius: 4px;
    width: fit-content;
    margin-left: 8px;
    ::before {
      content: "\\21B0"; /* ↰ */
      display: inline-block;
      font-style: normal;
      margin-right: 2px;
      font-size: 1.2rem;
      transform: rotate(90deg) scaleY(-1);
      transform-origin: center;
    }
  }
`;

const TitleContainer = styled.div`
  display: flex;
  align-items: center;
  margin: 0 0 2rem 0;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2rem;
  color: #333;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
  margin-bottom: 1rem;
  width: 100%;
  max-width: calc(100vw - 3rem);
  min-width: 1024px;
  overscroll-behavior: auto;
`;

const FormField = styled.div<{
  gap?: number;
  bgColor?: string;
  width?: string;
}>`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.gap || 0.25}rem;
  background-color: ${(props) => props.bgColor || "unset"};
  padding: ${(props) => (props.bgColor ? 0.25 : 0)}rem;
  border-radius: 4px;
  width: ${(props) => props.width || "unset"};

  &.full-width {
    grid-column: span 3;
  }
`;

const Label = styled.label<{ isTitle?: boolean; muted?: boolean }>`
  font-size: ${(props) =>
    props.isTitle ? "1" : props.muted ? "0.75" : "0.875"}rem;
  font-weight: 500;
  color: ${(props) => (props.isTitle ? "#555" : props.muted ? "#777" : "#666")};
  background-color: ${(props) => (props.isTitle ? "#D8ECFC" : "unset")};
  padding: ${(props) => (props.isTitle ? 0.25 : 0)}rem;
  border-radius: 4px;

  &.required::after {
    content: " *";
    color: #e74c3c;
  }
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: #fafafa;
  color: black;
  flex: 1;

  &:focus {
    outline: none;
    border-color: #74b9ff;
    background-color: white;
  }

  &:invalid {
    border-color: #fd79a8;
  }

  &:disabled {
    background-color: #f0f0f0;
  }

  &[type="checkbox"] {
    width: fit-content;
  }
`;

const TextArea = styled.textarea`
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.875rem;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  background-color: #fafafa;
  color: black;

  &:focus {
    outline: none;
    border-color: #74b9ff;
    background-color: white;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1rem;
  margin-right: 1rem;
  border-top: 1px solid #eee;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SubmitButton = styled(Button)`
  background-color: #3498db;
  color: white;
`;

const RemoveButton = styled.button<{ marginTop?: number }>`
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: opacity 0.2s;
  background-color: #e74c3c;
  color: white;
  margin-top: ${(props) => (isNil(props.marginTop) ? 0.5 : props.marginTop)}rem;

  &:hover {
    opacity: 0.8;
  }
`;

const DeleteButton = styled(RemoveButton)`
  margin-left: 2rem;
`;

const FileInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: #fafafa;
  color: black;

  &:focus {
    outline: none;
    border-color: #74b9ff;
    background-color: white;
  }
`;

const SelectedImage = styled.span`
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
  background-color: #e6ffe5;
  padding: 4px;
  border-radius: 4px;
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.div`
  font-size: 1rem;
  color: #333;
  font-weight: 500;
`;

const getSuggestedKey = (): string => {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
};

const getReprintOf = (
  key: string,
  printsItems: PrintDetails[],
  clusters: ClusterEntry[],
  clusterItems: ClusterItem[],
): string | null => {
  const reprintClusters = clusters.filter((c) => c.type === "reprint");
  const relevantCluster = clusterItems.find((ci) => ci.item_key === key);

  if (!relevantCluster) {
    return null;
  }

  const clusterKey = relevantCluster.cluster_key;
  const cluster = reprintClusters.find((c) => c.key === clusterKey);

  if (!cluster) {
    return null;
  }

  const itemsInCluster = clusterItems
    .filter((ci) => ci.cluster_key === clusterKey)
    .map((ci) => ci.item_key);

  if (itemsInCluster.length < 2) {
    return null;
  }

  const itemsWithYears = itemsInCluster
    .map((itemKey) => {
      const item = printsItems.find((p) => p.key === itemKey);
      return item
        ? { key: itemKey, year: (item.year && parseInt(item.year)) || 0 }
        : null;
    })
    .filter(Boolean) as { key: string; year: number }[];

  const minYear = Math.min(...itemsWithYears.map((i) => i.year));
  const earliestItems = itemsWithYears.filter((i) => i.year === minYear);

  if (earliestItems.some((i) => i.key === key)) {
    return null;
  }

  return earliestItems[0]?.key || null;
};

const generateCitationWithShortTitle = (
  item: PrintDetails,
  transcription?: ParatextTranscriptions,
): string => {
  const year = item.year || "s.d.";
  const authors = item.author_or_editor
    ? item.author_or_editor.split(",").map((s) => s.trim())
    : [];

  const getAuthorLastName = (author: string) => {
    return author.split(",")[0]?.trim() || author.trim();
  };

  let citation = "";
  if (authors.length === 0 || authors[0] === "") {
    citation = `s.n. ${year}`;
  } else if (authors.length === 1) {
    citation = `${getAuthorLastName(authors[0])} ${year}`;
  } else if (authors.length > 3) {
    citation = `${getAuthorLastName(authors[0])} et al. ${year}`;
  } else {
    const lastNames = authors.map(getAuthorLastName);
    citation = `${lastNames.slice(0, -1).join(", ")}, and ${lastNames[lastNames.length - 1]} ${year}`;
  }

  const shortTitle = item.short_title?.trim();
  if (shortTitle) {
    citation += ` (${shortTitle})`;
  } else if (transcription?.title) {
    const title =
      transcription.title.length > 50
        ? transcription.title.substring(0, 50) + "..."
        : transcription.title;
    citation += ` (${title})`;
  }

  return citation;
};

const loadExistingItem = async (key: string): Promise<EditionFormData> => {
  const [
    manuscriptsItems,
    manuscriptsMetadata,
    printsItems,
    printsMetadata,
    transcriptions,
    corpuses,
    translations,
    shelfmarks,
    reviews,
    bibliography,
    clusters,
    clusterItems,
    visualElements,
    visualElementExamples,
    locators,
  ] = await Promise.all([
    loadAndParseCsv<ManuscriptDetails>(CSV_PATH_ITEMS_MANUSCRIPT),
    loadAndParseCsv<ManuscriptElementsMetadata>(CSV_PATH_MD_MANUSCRIPT),
    loadAndParseCsv<PrintDetails>(CSV_PATH_ITEMS_PRINT),
    loadAndParseCsv<PrintElementsMetadata>(CSV_PATH_MD_PRINT),
    loadAndParseCsv<ParatextTranscriptions>(CSV_PATH_TRANSCRIPTIONS),
    loadAndParseCsv<StudyCorpuses>(CSV_PATH_CORPUSES),
    loadAndParseCsv<ParatextTranslations>(CSV_PATH_TRANSLATIONS),
    loadAndParseCsv<Shelfmarks>(CSV_PATH_SHELFMARKS),
    loadAndParseCsv<Review>(CSV_PATH_REVIEWS),
    loadAndParseCsv<BibliographyEntry>(CSV_PATH_BIBLIOGRAPHY),
    loadAndParseCsv<ClusterEntry>(CSV_PATH_CLUSTERS),
    loadAndParseCsv<ClusterItem>(CSV_PATH_CLUSTER_ITEMS),
    loadAndParseCsv<VisualElement>(CSV_PATH_VISUAL_ELEMENTS),
    loadAndParseCsv<VisualElementExample>(CSV_PATH_VISUAL_ELEMENTS_EXAMPLES),
    loadAndParseCsv<Locator>(CSV_PATH_LOCATORS),
  ]);
  const manuscriptItem = manuscriptsItems.find((item) => item.key === key);
  const manuscriptMd = manuscriptsMetadata.find((item) => item.key === key);
  const printItem = printsItems.find((item) => item.key === key);
  const printMd = printsMetadata.find((item) => item.key === key);
  const isManuscript = !!manuscriptItem;
  const transcription = transcriptions.find((t) => t.key === key);
  const isElements = manuscriptMd || printMd;
  return {
    key,
    shortTitle: isManuscript
      ? manuscriptItem!.short_title || ""
      : printItem!.short_title || "",
    shortTitleSource: isManuscript
      ? manuscriptItem!.short_title_source || ""
      : printItem!.short_title_source || "",
    cities: isManuscript
      ? []
      : printItem!.city
        ? printItem!.city.split(",").map((s) => s.trim())
        : [],
    notes: isManuscript ? manuscriptItem!.notes || "" : printItem!.notes || "",
    corpus:
      corpuses
        .find((c) => c.key === key)
        ?.study.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || [],
    shelfmarks: shelfmarks
      .filter((s) => s.key === key)
      .map((s) => ({
        volume: s.volume ? parseInt(s.volume, 10) : null,
        scan: s.scan,
        shelfmark: s.shelf_mark,
        title_page_img: s.title_page_img,
        frontispiece_img: s.frontispiece_img,
        annotations: s.annotations,
        copyright: s.copyright,
      })),
    verified: reviews.some((r) => r.key === key),
    bibliography: bibliography
      .filter((b) => b.key === key)
      .map((b) => b.citation),
    reprintOf: getReprintOf(key, printsItems, clusters, clusterItems),
    visualElements: visualElements
      .filter((ve) => ve.key === key)
      .map((ve) => {
        const locator = ve.locator_key
          ? locators.find((l) => l.key === ve.locator_key) || null
          : null;
        const examples = visualElementExamples
          .filter((vee) => vee.key === ve.key)
          .map((vee) => ({
            img: vee.path,
            has_locator: !!vee.locator_key,
            locator: vee.locator_key
              ? locators.find((l) => l.key === vee.locator_key) || null
              : null,
          }));

        return {
          key: ve.key,
          visual_element_type: ve.visual_element_type,
          notes: ve.notes || "",
          locator_type: ve.locator_type,
          locator,
          examples,
        };
      }),
    ...(isManuscript
      ? {
          isManuscript: true,
          manuscriptYearFrom: manuscriptItem!.year_from
            ? parseInt(manuscriptItem!.year_from, 10)
            : 0,
          manuscriptYearTo: manuscriptItem!.year_to
            ? parseInt(manuscriptItem!.year_to, 10)
            : 0,
          manuscriptClass: manuscriptMd?.class || "",
          manuscriptSubclass: manuscriptMd?.subclass || null,
        }
      : {
          isManuscript: false,
          year: printItem!.year,
          languages: printItem!.language
            ? printItem!.language.split(",").map((s) => s.trim())
            : [],
          editor: printItem!.author_or_editor
            ? printItem!.author_or_editor.split(",").map((s) => s.trim())
            : [],
          publisher: printItem!.publisher
            ? printItem!.publisher.split(",").map((s) => s.trim())
            : [],
          format: printItem!.format ? parseInt(printItem!.format, 10) : null,
          volumes: printItem!.volumes ? parseInt(printItem!.volumes, 10) : 1,
          ustcId: printItem!.ustc_id || null,
          title: transcription?.title || null,
          title_EN:
            translations.find((t) => t.key === key && t.field === "title")
              ?.en || null,
          imprint: transcription?.imprint || null,
          imprint_EN:
            translations.find((t) => t.key === key && t.field === "imprint")
              ?.en || null,
          colophon: transcription?.colophon || null,
          colophon_EN:
            translations.find((t) => t.key === key && t.field === "colophon")
              ?.en || null,
          frontispiece: transcription?.frontispiece || null,
          frontispiece_EN:
            translations.find(
              (t) => t.key === key && t.field === "frontispiece",
            )?.en || null,
        }),
    ...(isElements
      ? {
          isElements: true,
          books: parseBooks(
            isManuscript
              ? manuscriptMd!.elements_books
              : printMd!.elements_books,
          ).elementsBooksExpanded,
          additionalContent: isManuscript
            ? ([] as string[])
            : printMd!.additional_content
                ?.split(",")
                .map((s) => s.trim())
                .filter(Boolean) || [],
        }
      : { isElements: false }),
  };
};

const defaultValues = (): EditionFormData => ({
  key: getSuggestedKey(),
  shortTitle: "",
  shortTitleSource: "",
  cities: [],
  notes: "",
  corpus: [],
  shelfmarks: [
    {
      volume: 1,
      scan: null,
      shelfmark: null,
      title_page_img: null,
      frontispiece_img: null,
      annotations: null,
      copyright: null,
    },
  ],
  verified: false,
  isManuscript: false,
  year: "",
  languages: [],
  editor: [],
  publisher: [],
  format: null,
  volumes: null,
  ustcId: null,
  title: null,
  title_EN: null,
  imprint: null,
  imprint_EN: null,
  colophon: null,
  colophon_EN: null,
  frontispiece: null,
  frontispiece_EN: null,
  isElements: true,
  books: [],
  additionalContent: [],
  bibliography: [],
  reprintOf: null,
  visualElements: [],
});

function toOptions<T extends Record<string, string | null>>(
  items: T[],
  field: keyof T,
): string[] {
  return uniq(
    items
      .flatMap((item) => item[field]?.split(",").map((s) => s.trim()) || [])
      .filter(Boolean)
      .sort(),
  );
}

function deepTrim<T>(input: T): T {
  if (typeof input === "string") {
    return input.trim() as unknown as T;
  }

  if (input === null || typeof input !== "object") {
    return input;
  }

  if (Array.isArray(input)) {
    return input
      .map((item) => deepTrim(item))
      .filter((item) => {
        if (typeof item === "string") return item.length > 0;
        return item !== null && item !== undefined;
      }) as unknown as T;
  }

  const trimmedObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    trimmedObj[key] = deepTrim(value);
  }

  return trimmedObj as T;
}

export const UpsertEdition = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const key = searchParams.get("key");
  const { token } = useContext(AuthContext);
  const [images, setImages] = useState<Record<string, File>>({});
  const [values, setValues] = useState(defaultValues());
  const [valuesLoading, setValuesLoading] = useState(!!key);
  const [listsLoading, setListsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lists, setLists] = useState<{
    editors: string[];
    publishers: string[];
    additionalContents: string[];
    cities: string[];
    reprintOptions: { value: string; label: string }[];
    visualElementTypes: string[];
    locatorTypes: string[];
  }>();
  const formContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm({
    defaultValues: values,
    onSubmit: async ({ value }) => {
      if (!token) {
        return;
      }
      try {
        value.bibliography = value.bibliography.filter((b) => b);
        deepTrim(value);
        await upsertEdition(toModelEdition(value), images);
        invalidateCsvCache();
        navigate(CATALOGUE_ROUTE);
      } catch (err) {
        console.error(err);
        alert("Failed to submit form");
      }
    },
    onSubmitInvalid: ({ value, formApi }) => {
      console.warn("Submission failed!", value, formApi.state.fieldMeta);
      if (formContainerRef.current) {
        formContainerRef.current.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    },
    validators: {
      onBlur: ({ value }) => {
        return {
          fields: {
            manuscriptYearTo:
              value.isManuscript &&
              value.manuscriptYearFrom &&
              value.manuscriptYearTo
                ? value.manuscriptYearTo < value.manuscriptYearFrom
                  ? "Manuscript year (upper) cannot be less than year (lower)"
                  : undefined
                : undefined,
          },
        };
      },
    },
  });
  const isManuscript = useStore(form.store, (s) => s.values.isManuscript);
  const isElements = useStore(form.store, (s) => s.values.isElements);

  const fetchAndMergeUstcData = async (ustcId: string) => {
    if (!ustcId || isNaN(Number(ustcId)) || !token) {
      return;
    }

    try {
      const data = await ustcLookup(ustcId);
      if (!data || Object.keys(data).length === 0) {
        return;
      }

      const currentValues = form.state.values;

      if ((data.authors || [])?.length > 0 && !currentValues.editor?.length) {
        form.setFieldValue(
          "editor",
          data.authors!.map((a) => a.trim()),
        );
      }

      if (data.short_title && !currentValues.shortTitle) {
        form.setFieldValue("shortTitle", data.short_title.trim());
        form.setFieldValue("shortTitleSource", "Provided by catalog");
      }

      if (
        (data.publishers || [])?.length > 0 &&
        !currentValues.publisher?.length
      ) {
        form.setFieldValue(
          "publisher",
          data.publishers!.map((p) => p.trim()),
        );
      }

      if (data.city && !currentValues.cities.length) {
        form.setFieldValue("cities", [data.city.trim()]);
      }

      if (data.year && !currentValues.year) {
        form.setFieldValue("year", data.year.toString().trim());
      }

      if (
        (data.languages || [])?.length > 0 &&
        !currentValues.languages?.length
      ) {
        form.setFieldValue(
          "languages",
          data.languages!.map((l) => l.trim()),
        );
      }

      if (data.format && !currentValues.format) {
        const formatNumber = data.format.replace("º", "").replace("°", "");
        if (!isNaN(Number(formatNumber))) {
          form.setFieldValue("format", Number(formatNumber));
        }
      }

      if ((data.digitizations || [])?.length > 0) {
        const existingShelfmarks = currentValues.shelfmarks || [];
        const newShelfmarks = data
          .digitizations!.map((url: string) => ({
            volume: 1,
            scan: url,
            shelfmark: null,
            title_page_img: null,
            frontispiece_img: null,
            annotations: null,
            copyright: null,
          }))
          .filter(
            (shelfmark) =>
              !existingShelfmarks.some((s) => s.scan === shelfmark.scan),
          );

        form.setFieldValue("shelfmarks", [
          ...existingShelfmarks.filter((s) => s.scan),
          ...newShelfmarks,
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch USTC data:", error);
    }
  };

  useEffect(() => {
    if (!key) {
      return;
    }
    loadExistingItem(key)
      .then((item) => {
        setValues(item);
        setValuesLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load existing item:", { key }, e);
        alert("Failed to load existing item");
      });
  }, [key]);

  useEffect(() => {
    Promise.all([
      loadAndParseCsv<PrintDetails>(CSV_PATH_ITEMS_PRINT),
      loadAndParseCsv<PrintElementsMetadata>(CSV_PATH_MD_PRINT),
      loadAndParseCsv<ParatextTranscriptions>(CSV_PATH_TRANSCRIPTIONS),
      // @ts-expect-error csv record
      loadAndParseCsv<City>(CSV_PATH_CITIES),
      loadAndParseCsv<VisualElement>(CSV_PATH_VISUAL_ELEMENTS),
      loadAndParseCsv<Locator>(CSV_PATH_LOCATORS),
    ])
      .then(
        ([
          printItems,
          elementsMd,
          transcriptions,
          cities,
          visualElements,
          locators,
        ]) => {
          const editors = toOptions(printItems, "author_or_editor");
          const publishers = toOptions(printItems, "publisher");
          const additionalContents = toOptions(
            elementsMd,
            "additional_content",
          );
          const cityNames = cities.map((c) => c.city).filter(Boolean);

          const reprintOptions = printItems
            .map((item) => {
              const transcription = transcriptions.find(
                (t) => t.key === item.key,
              );
              return {
                value: item.key,
                label: generateCitationWithShortTitle(item, transcription),
              };
            })
            .sort((a, b) => a.label.localeCompare(b.label));

          const visualElementTypes = uniq(
            visualElements.map((ve) => ve.visual_element_type).filter(Boolean),
          ).sort();
          const locatorTypes = uniq([
            ...locators.map((l) => l.type).filter(Boolean),
            "Proposition",
            "Definition",
            "Common notion",
            "Scholia of proposition",
          ]).sort() as string[];

          setLists({
            editors,
            publishers,
            additionalContents,
            cities: cityNames,
            reprintOptions,
            visualElementTypes,
            locatorTypes,
          });
        },
      )
      .finally(() => setListsLoading(false));
  }, []);

  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

  const handleDelete = async () => {
    if (!key || !token) {
      return;
    }

    if (!confirm(`Are you sure you want to delete edition "${key}"?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteEdition(key);
      invalidateCsvCache();
      navigate(CATALOGUE_ROUTE);
    } catch (err) {
      console.error(err);
      alert("Failed to delete edition");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageContainer>
      {(isSubmitting || isDeleting) && (
        <LoadingOverlay>
          <LoadingSpinner />
          <LoadingText>
            {isDeleting
              ? "Deleting record..."
              : key
                ? "Updating record..."
                : "Adding record..."}
          </LoadingText>
        </LoadingOverlay>
      )}
      <FormContainer ref={formContainerRef}>
        <TitleContainer>
          <Title>{key ? "Update a record" : "Add a record"}</Title>
          {key && (
            <DeleteButton
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </DeleteButton>
          )}
        </TitleContainer>
        {valuesLoading || listsLoading ? (
          <div>Loading...</div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <FormGrid>
              <FormField className="full-width">
                <Label className="required">Key</Label>
                <form.Field name="key">
                  {(field) => (
                    <Input type="text" value={field.state.value} disabled />
                  )}
                </form.Field>
              </FormField>

              <FormField>
                <Label className="required">Short Title</Label>
                <form.Field
                  name="shortTitle"
                  validators={{
                    onBlur: ({ value }) => !value && "Short title is required",
                  }}
                >
                  {(field) => (
                    <>
                      <Input
                        type="text"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                      {!field.state.meta.isValid && (
                        <em>{field.state.meta.errors.join(",")}</em>
                      )}
                    </>
                  )}
                </form.Field>
              </FormField>

              <FormField>
                <Label className="required">Short Title Source</Label>
                <form.Field
                  name="shortTitleSource"
                  validators={{
                    onBlur: ({ value }) =>
                      !value && "Short title source is required",
                  }}
                >
                  {(field) => (
                    <>
                      <SingleSelect
                        name="short title source"
                        options={SHORT_TITLE_SOURCES.map((item) => ({
                          value: item,
                          label: item,
                        }))}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(value) =>
                          field.handleChange((value as string) || "")
                        }
                        placeholder="Choose how the short title was determined..."
                      />
                      {!field.state.meta.isValid && (
                        <em>{field.state.meta.errors.join(",")}</em>
                      )}
                    </>
                  )}
                </form.Field>
              </FormField>

              <FormField>
                <Label className="required">Item Type</Label>
                <form.Field name="isManuscript">
                  {(field) => (
                    <SingleSelect
                      name="item type"
                      options={[
                        { value: "false", label: "Printed Edition" },
                        { value: "true", label: "Manuscript" },
                      ]}
                      value={field.state.value ? "true" : "false"}
                      onBlur={field.handleBlur}
                      onChange={(value) => field.handleChange(value === "true")}
                      placeholder="Select type..."
                    />
                  )}
                </form.Field>
              </FormField>

              <FormField />
              <FormField />

              {isManuscript && (
                <>
                  <FormField className="full-width">
                    <Label isTitle>Manuscript Properties</Label>
                  </FormField>

                  <FormField>
                    <Label>Year (lower range)</Label>
                    <form.Field
                      name="manuscriptYearFrom"
                      validators={{
                        onBlur: ({ value }) =>
                          (value ?? 0) > 2000 || (value ?? 0) < 0
                            ? "Year must be between 0 and 2000"
                            : undefined,
                      }}
                    >
                      {(field) => (
                        <>
                          <Input
                            type="number"
                            value={field.state.value}
                            min={0}
                            max={2000}
                            onChange={(e) =>
                              field.handleChange(e.target.valueAsNumber)
                            }
                            onBlur={field.handleBlur}
                          />
                          {!field.state.meta.isValid && (
                            <em>{field.state.meta.errors.join(",")}</em>
                          )}
                        </>
                      )}
                    </form.Field>
                  </FormField>
                  <FormField>
                    <Label>Year (upper range)</Label>
                    <form.Field
                      name="manuscriptYearTo"
                      validators={{
                        onBlur: ({ value }) =>
                          (value ?? 0) > 2000 || (value ?? 0) < 0
                            ? "Year must be between 0 and 2000"
                            : undefined,
                      }}
                    >
                      {(field) => (
                        <>
                          <Input
                            type="number"
                            value={field.state.value}
                            min={0}
                            max={2000}
                            onChange={(e) =>
                              field.handleChange(e.target.valueAsNumber)
                            }
                            onBlur={field.handleBlur}
                          />
                          {!field.state.meta.isValid && (
                            <em>{field.state.meta.errors.join(",")}</em>
                          )}
                        </>
                      )}
                    </form.Field>
                  </FormField>

                  <FormField>
                    <Label className="required">Manuscript Class</Label>
                    <form.Field
                      name="manuscriptClass"
                      validators={{
                        onBlur: ({ value }) =>
                          !value && "Manuscript class is required",
                      }}
                    >
                      {(field) => (
                        <>
                          <Input
                            type="text"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                          {!field.state.meta.isValid && (
                            <em>{field.state.meta.errors.join(",")}</em>
                          )}
                        </>
                      )}
                    </form.Field>
                  </FormField>
                </>
              )}

              {!isManuscript && (
                <>
                  <FormField className="full-width">
                    <Label isTitle>Printed Edition Properties</Label>
                  </FormField>

                  <FormField>
                    <Label className="required">Year</Label>
                    <form.Field
                      name="year"
                      validators={{
                        onBlur: ({ value }) =>
                          !value || Number(value) < 1400 || Number(value) > 2000
                            ? "Year is required and must be between 1400 and 2000"
                            : undefined,
                      }}
                    >
                      {(field) => (
                        <>
                          <Input
                            type="number"
                            min={1400}
                            max={2000}
                            value={field.state.value || ""}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                          {!field.state.meta.isValid && (
                            <em>{field.state.meta.errors.join(",")}</em>
                          )}
                        </>
                      )}
                    </form.Field>
                  </FormField>

                  <FormField>
                    <Label>Cities</Label>
                    <form.Field
                      name="cities"
                      validators={{
                        onBlur: ({ value }) =>
                          value && value.length !== uniq(value).length
                            ? "Cities must be unique"
                            : value && value.some((v) => !v)
                              ? "City names cannot be empty"
                              : undefined,
                      }}
                    >
                      {(field) => (
                        <>
                          <MultiSelect
                            name="cities"
                            options={lists?.cities || []}
                            value={field.state.value}
                            onChange={(values) =>
                              field.handleChange(values.map((v) => v))
                            }
                            onBlur={field.handleBlur}
                            isCreatable={true}
                            placeholder="Choose or add cities of publication..."
                          />
                          {!field.state.meta.isValid && (
                            <em>{field.state.meta.errors.join(",")}</em>
                          )}
                        </>
                      )}
                    </form.Field>
                  </FormField>

                  <FormField>
                    <Label className="required">Languages</Label>
                    <form.Field
                      name="languages"
                      validators={{
                        onBlur: ({ value }) =>
                          !value || value.length < 1
                            ? "At least one language is required"
                            : value.length !== uniq(value).length
                              ? "Languages must be unique"
                              : undefined,
                      }}
                    >
                      {(field) => (
                        <>
                          <MultiSelect
                            name="languages"
                            options={LANGUAGES.map((lang) => lang)}
                            value={field.state.value}
                            onChange={(values) =>
                              field.handleChange(values.map((v) => v))
                            }
                            onBlur={field.handleBlur}
                            placeholder="Select languages used in the text..."
                          />
                          {!field.state.meta.isValid && (
                            <em>{field.state.meta.errors.join(",")}</em>
                          )}
                        </>
                      )}
                    </form.Field>
                  </FormField>

                  <FormField>
                    <Label className="required">Editors</Label>
                    <form.Field
                      name="editor"
                      validators={{
                        onBlur: ({ value }) =>
                          !value || value.length < 1
                            ? "At least one editor is required"
                            : value.length !== uniq(value).length
                              ? "Editors must be unique"
                              : undefined,
                      }}
                    >
                      {(field) => (
                        <>
                          <MultiSelect
                            name="editors"
                            options={lists?.editors || []}
                            value={field.state.value}
                            onChange={(values) =>
                              field.handleChange(values.map((v) => v))
                            }
                            onBlur={field.handleBlur}
                            isCreatable={true}
                            placeholder="Choose or add editors/authors..."
                          />
                          {!field.state.meta.isValid && (
                            <em>{field.state.meta.errors.join(",")}</em>
                          )}
                        </>
                      )}
                    </form.Field>
                  </FormField>

                  <FormField>
                    <Label>Publishers</Label>
                    <form.Field
                      name="publisher"
                      validators={{
                        onBlur: ({ value }) =>
                          value && value.length !== uniq(value).length
                            ? "Publishers must be unique"
                            : undefined,
                      }}
                    >
                      {(field) => (
                        <>
                          <MultiSelect
                            name="publishers"
                            options={lists?.publishers || []}
                            value={field.state.value}
                            onChange={(values) =>
                              field.handleChange(values.map((v) => v))
                            }
                            onBlur={field.handleBlur}
                            isCreatable={true}
                            placeholder="Choose or add publishers..."
                          />
                          {!field.state.meta.isValid && (
                            <em>{field.state.meta.errors.join(",")}</em>
                          )}
                        </>
                      )}
                    </form.Field>
                  </FormField>

                  <FormField>
                    <Label>Format</Label>
                    <form.Field name="format">
                      {(field) => (
                        <SingleSelect
                          name="format"
                          options={FORMATS.map((item) => ({
                            value: Number(item.replace("º", "")),
                            label: item,
                          }))}
                          value={field.state.value ?? null}
                          onBlur={field.handleBlur}
                          onChange={(value) => {
                            const numValue =
                              typeof value === "number" ? value : undefined;
                            field.handleChange(numValue);
                          }}
                          placeholder="Select book format..."
                        />
                      )}
                    </form.Field>
                  </FormField>

                  <FormField>
                    <Label className="required">Number of Volumes</Label>
                    <form.Field
                      name="volumes"
                      defaultValue={1}
                      validators={{
                        onBlur: ({ value }) =>
                          !value || Number(value) < 1 || Number(value) > 50
                            ? "Number of volumes is required and must be between 1 and 50"
                            : undefined,
                      }}
                    >
                      {(field) => (
                        <>
                          <Input
                            type="number"
                            min={1}
                            max={50}
                            value={field.state.value || ""}
                            onChange={(e) =>
                              field.handleChange(e.target.valueAsNumber)
                            }
                            onBlur={field.handleBlur}
                          />
                          {!field.state.meta.isValid && (
                            <em>{field.state.meta.errors.join(",")}</em>
                          )}
                        </>
                      )}
                    </form.Field>
                  </FormField>

                  <FormField>
                    <Label>USTC ID</Label>
                    <form.Field
                      name="ustcId"
                      validators={{
                        onBlur: ({ value }) =>
                          value && value.trim() !== "-" && isNaN(Number(value))
                            ? "USTC ID must be a number"
                            : undefined,
                      }}
                    >
                      {(field) => (
                        <>
                          <Input
                            type="text"
                            value={field.state.value || ""}
                            onChange={(e) =>
                              field.handleChange(e.target.value || null)
                            }
                            onBlur={async (e) => {
                              field.handleBlur();
                              await fetchAndMergeUstcData(e.target.value);
                            }}
                          />
                          {!field.state.meta.isValid && (
                            <em>{field.state.meta.errors.join(",")}</em>
                          )}
                        </>
                      )}
                    </form.Field>
                  </FormField>

                  <FormField>
                    <Label>Reprint of</Label>
                    <form.Field name="reprintOf">
                      {(field) => (
                        <SingleSelect
                          name="reprint edition"
                          options={lists?.reprintOptions || []}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(value) =>
                            field.handleChange((value as string) || "")
                          }
                          placeholder="Select a previous edition..."
                        />
                      )}
                    </form.Field>
                  </FormField>

                  <FormField>
                    <Label>Title</Label>
                    <form.Field name="title">
                      {(field) => (
                        <TextArea
                          value={field.state.value || ""}
                          onChange={(e) =>
                            field.handleChange(e.target.value || null)
                          }
                          onBlur={field.handleBlur}
                        />
                      )}
                    </form.Field>
                  </FormField>

                  <FormField>
                    <Label>Imprint</Label>
                    <form.Field name="imprint">
                      {(field) => (
                        <TextArea
                          value={field.state.value || ""}
                          onChange={(e) =>
                            field.handleChange(e.target.value || null)
                          }
                          onBlur={field.handleBlur}
                        />
                      )}
                    </form.Field>
                  </FormField>

                  <FormField />

                  <FormField>
                    <Label>Title (English)</Label>
                    <form.Field name="title_EN">
                      {(field) => (
                        <TextArea
                          value={field.state.value || ""}
                          onChange={(e) =>
                            field.handleChange(e.target.value || null)
                          }
                          onBlur={field.handleBlur}
                        />
                      )}
                    </form.Field>
                  </FormField>

                  <FormField>
                    <Label>Imprint (English)</Label>
                    <form.Field name="imprint_EN">
                      {(field) => (
                        <TextArea
                          value={field.state.value || ""}
                          onChange={(e) =>
                            field.handleChange(e.target.value || null)
                          }
                          onBlur={field.handleBlur}
                        />
                      )}
                    </form.Field>
                  </FormField>

                  <FormField />

                  <FormField>
                    <Label>Colophon</Label>
                    <form.Field name="colophon">
                      {(field) => (
                        <TextArea
                          value={field.state.value || ""}
                          onChange={(e) =>
                            field.handleChange(e.target.value || null)
                          }
                          onBlur={field.handleBlur}
                        />
                      )}
                    </form.Field>
                  </FormField>

                  <FormField>
                    <Label>Colophon (English)</Label>
                    <form.Field name="colophon_EN">
                      {(field) => (
                        <TextArea
                          value={field.state.value || ""}
                          onChange={(e) =>
                            field.handleChange(e.target.value || null)
                          }
                          onBlur={field.handleBlur}
                        />
                      )}
                    </form.Field>
                  </FormField>

                  <FormField />

                  <FormField>
                    <Label>Frontispiece Text</Label>
                    <form.Field name="frontispiece">
                      {(field) => (
                        <TextArea
                          value={field.state.value || ""}
                          onChange={(e) =>
                            field.handleChange(e.target.value || null)
                          }
                          onBlur={field.handleBlur}
                        />
                      )}
                    </form.Field>
                  </FormField>

                  <FormField>
                    <Label>Frontispiece Text (English)</Label>
                    <form.Field name="frontispiece_EN">
                      {(field) => (
                        <TextArea
                          value={field.state.value || ""}
                          onChange={(e) =>
                            field.handleChange(e.target.value || null)
                          }
                          onBlur={field.handleBlur}
                        />
                      )}
                    </form.Field>
                  </FormField>
                </>
              )}

              <FormField className="full-width" />
              <FormField>
                <Label>Is Elements</Label>
                <form.Field name="isElements">
                  {(field) => (
                    <SingleSelect
                      name="if is Elements"
                      options={[
                        { value: "false", label: "No" },
                        { value: "true", label: "Yes" },
                      ]}
                      value={field.state.value ? "true" : "false"}
                      onBlur={field.handleBlur}
                      onChange={(value) => field.handleChange(value === "true")}
                      placeholder="Does this edition contain Elements?"
                    />
                  )}
                </form.Field>
              </FormField>

              {isElements && (
                <>
                  <FormField className="full-width">
                    <Label isTitle>Elements Metadata</Label>
                  </FormField>

                  <FormField>
                    <Label>Books</Label>
                    <form.Field name="books">
                      {(field) => (
                        <MultiSelect
                          name="books"
                          options={Array.from({ length: 18 }, (_, i) =>
                            (i + 1).toString(),
                          )}
                          value={(field.state.value || []).map(String)}
                          onChange={(values) =>
                            field.handleChange(values.map(Number))
                          }
                          onBlur={field.handleBlur}
                          placeholder="Select which books of Elements are included..."
                        />
                      )}
                    </form.Field>
                  </FormField>

                  <FormField>
                    <Label>Additional Content</Label>
                    <form.Field name="additionalContent">
                      {(field) => (
                        <MultiSelect
                          name="additionalContent"
                          options={lists?.additionalContents || []}
                          value={field.state.value}
                          onChange={(values) =>
                            field.handleChange(values.map((v) => v))
                          }
                          onBlur={field.handleBlur}
                          isCreatable={true}
                          placeholder="Choose or add additional content types..."
                        />
                      )}
                    </form.Field>
                  </FormField>
                </>
              )}

              <FormField className="full-width" />

              <FormField>
                <Label>Corpus</Label>
                <form.Field name="corpus">
                  {(field) => (
                    <MultiSelect
                      name="corpus"
                      options={STUDY_CORPUSES.sort((c1, c2) =>
                        c1.label.localeCompare(c2.label),
                      ).map((c) => c.name)}
                      value={field.state.value}
                      onChange={(values) =>
                        field.handleChange(values.map((v) => v))
                      }
                      onBlur={field.handleBlur}
                      labelFn={(name) =>
                        STUDY_CORPUSES.find((c) => c.name === name)?.label ||
                        name
                      }
                      placeholder="Select which research corpuses include this item..."
                    />
                  )}
                </form.Field>
              </FormField>

              <form.Field name="shelfmarks">
                {(field) => (
                  <>
                    <FormField className="full-width">
                      <Label isTitle>Sources</Label>
                      <button
                        style={{
                          padding: 4,
                          width: "fit-content",
                          cursor: "pointer",
                        }}
                        type="button"
                        onClick={() =>
                          field.pushValue({
                            volume: 1,
                            scan: null,
                            shelfmark: null,
                            title_page_img: null,
                            frontispiece_img: null,
                            annotations: null,
                            copyright: null,
                          })
                        }
                      >
                        Add a source
                      </button>

                      {!field.state.meta.isValid && (
                        <em>{field.state.meta.errors.join(", ")}</em>
                      )}
                    </FormField>
                    {field.state.value.map((_, i) => (
                      <FormField key={i} gap={0.5} bgColor="#D8ECFC">
                        <FormField>
                          <Label>Volume</Label>
                          <form.Field name={`shelfmarks[${i}].volume`}>
                            {(f) => (
                              <Input
                                type="number"
                                defaultValue={1}
                                value={f.state.value || ""}
                                onChange={(e) =>
                                  f.handleChange(e.target.valueAsNumber || null)
                                }
                                onBlur={f.handleBlur}
                                placeholder="Volume"
                              />
                            )}
                          </form.Field>
                        </FormField>
                        <FormField>
                          <Label>Facsimile URL</Label>
                          <form.Field
                            name={`shelfmarks[${i}].scan`}
                            validators={{
                              onBlur: ({ value }) =>
                                value && !isValidUrl(value)
                                  ? "Must be a valid URL"
                                  : undefined,
                            }}
                          >
                            {(f) => (
                              <>
                                <Input
                                  type="text"
                                  value={f.state.value || ""}
                                  onChange={(e) =>
                                    f.handleChange(e.target.value || null)
                                  }
                                  onBlur={f.handleBlur}
                                  placeholder="Facsimile URL"
                                />
                                {!f.state.meta.isValid && (
                                  <em>{f.state.meta.errors.join(", ")}</em>
                                )}
                              </>
                            )}
                          </form.Field>
                        </FormField>

                        <FormField>
                          <Label>Shelfmark</Label>
                          <form.Field name={`shelfmarks[${i}].shelfmark`}>
                            {(f) => (
                              <Input
                                type="text"
                                value={f.state.value || ""}
                                onChange={(e) =>
                                  f.handleChange(e.target.value || null)
                                }
                                onBlur={f.handleBlur}
                                placeholder="Shelfmark"
                              />
                            )}
                          </form.Field>
                        </FormField>

                        <FormField>
                          <form.Field name={`shelfmarks[${i}].title_page_img`}>
                            {(f) => (
                              <>
                                <Label>
                                  Title Page Image{" "}
                                  {f.state.value && (
                                    <SelectedImage>Image is set</SelectedImage>
                                  )}
                                </Label>
                                <FileInput
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (!e.target.files?.[0]) {
                                      f.handleChange(null);
                                    } else {
                                      const id = uniqueId();
                                      setImages((m) => ({
                                        ...m,
                                        [id]: e.target.files![0],
                                      }));
                                      f.handleChange(id);
                                    }
                                  }}
                                />
                                {f.state.value && images[f.state.value] && (
                                  <div>
                                    <SelectedImage>
                                      Selected: {images[f.state.value].name}
                                    </SelectedImage>
                                  </div>
                                )}
                              </>
                            )}
                          </form.Field>
                        </FormField>

                        <FormField>
                          <Label>Frontispiece Image</Label>
                          <form.Field
                            name={`shelfmarks[${i}].frontispiece_img`}
                          >
                            {(f) => (
                              <>
                                <FileInput
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (!e.target.files?.[0]) {
                                      f.handleChange(null);
                                    } else {
                                      const id = uniqueId();
                                      setImages((m) => ({
                                        ...m,
                                        [id]: e.target.files![0],
                                      }));
                                      f.handleChange(id);
                                    }
                                  }}
                                />
                                {f.state.value && (
                                  <SelectedImage>
                                    {images[f.state.value]
                                      ? `Selected: ${images[f.state.value].name}`
                                      : "Image is set"}
                                  </SelectedImage>
                                )}
                              </>
                            )}
                          </form.Field>
                        </FormField>

                        <FormField>
                          <Label>Annotations</Label>
                          <form.Field name={`shelfmarks[${i}].annotations`}>
                            {(f) => (
                              <SingleSelect
                                name="annotations"
                                options={ANNOTATIONS.map((annotation) => ({
                                  value: annotation,
                                  label: startCase(annotation),
                                }))}
                                value={
                                  f.state.value ||
                                  ANNOTATIONS[ANNOTATIONS.length - 1]
                                }
                                onBlur={field.handleBlur}
                                onChange={(value) =>
                                  f.handleChange(value as string | null)
                                }
                                placeholder="Select annotation level..."
                              />
                            )}
                          </form.Field>
                        </FormField>
                        <FormField>
                          <Label>Copyright</Label>
                          <form.Field name={`shelfmarks[${i}].copyright`}>
                            {(f) => (
                              <Input
                                type="text"
                                value={f.state.value || ""}
                                onChange={(e) =>
                                  f.handleChange(e.target.value || null)
                                }
                                onBlur={f.handleBlur}
                                placeholder="Copyright"
                              />
                            )}
                          </form.Field>
                        </FormField>

                        <RemoveButton
                          type="button"
                          onClick={() => field.removeValue(i)}
                        >
                          Remove Source
                        </RemoveButton>
                      </FormField>
                    ))}
                  </>
                )}
              </form.Field>

              <form.Field name="bibliography">
                {(field) => (
                  <>
                    <FormField className="full-width">
                      <Label isTitle>Bibliography</Label>
                      <button
                        style={{
                          padding: 4,
                          width: "fit-content",
                          cursor: "pointer",
                        }}
                        type="button"
                        onClick={() => field.pushValue("")}
                      >
                        Add citation
                      </button>
                    </FormField>
                    {field.state.value.map((_, i) => (
                      <FormField key={i} className="full-width">
                        <form.Field name={`bibliography[${i}]`}>
                          {(f) => (
                            <Row justifyStart width="50%">
                              <Input
                                type="text"
                                value={f.state.value || ""}
                                onChange={(e) => f.handleChange(e.target.value)}
                                onBlur={f.handleBlur}
                                placeholder="Enter citation string..."
                              />
                              <RemoveButton
                                type="button"
                                onClick={() => field.removeValue(i)}
                                marginTop={0}
                              >
                                Remove citation
                              </RemoveButton>
                            </Row>
                          )}
                        </form.Field>
                      </FormField>
                    ))}
                  </>
                )}
              </form.Field>

              <form.Field name="visualElements">
                {(field) => (
                  <>
                    <FormField className="full-width">
                      <Label isTitle>Visual Elements</Label>
                      <button
                        style={{
                          padding: 4,
                          width: "fit-content",
                          cursor: "pointer",
                        }}
                        type="button"
                        onClick={() =>
                          field.pushValue({
                            visual_element_type: "",
                            notes: "",
                            locator_type: "uncatalogued",
                            locator: null,
                            examples: [],
                          })
                        }
                      >
                        Add visual element
                      </button>

                      {!field.state.meta.isValid && (
                        <em>{field.state.meta.errors.join(", ")}</em>
                      )}
                    </FormField>
                    {field.state.value.map((_, i) => (
                      <FormField key={i} gap={0.5} bgColor="#D8ECFC">
                        <FormField>
                          <Label className="required">
                            Visual Element Type
                          </Label>
                          <form.Field
                            name={`visualElements[${i}].visual_element_type`}
                            validators={{
                              onBlur: ({ value }) =>
                                !value && "Visual element type is required",
                            }}
                          >
                            {(f) => (
                              <>
                                <SingleSelect
                                  name="type"
                                  options={
                                    lists?.visualElementTypes?.map((t) => ({
                                      value: t,
                                      label: t,
                                    })) || []
                                  }
                                  value={f.state.value}
                                  onChange={(value) => {
                                    const strValue = (value || "") as string;
                                    if (
                                      strValue &&
                                      !lists?.visualElementTypes?.includes(
                                        strValue,
                                      )
                                    ) {
                                      setLists(
                                        (l) =>
                                          ({
                                            ...l,
                                            visualElementTypes: [
                                              ...(l!.visualElementTypes || []),
                                              strValue,
                                            ],
                                          }) as typeof lists,
                                      );
                                    }
                                    f.handleChange(strValue);
                                  }}
                                  onBlur={f.handleBlur}
                                  isCreatable
                                  placeholder="e.g., diagram, figure, table"
                                />
                                {!f.state.meta.isValid && (
                                  <em>{f.state.meta.errors.join(", ")}</em>
                                )}
                              </>
                            )}
                          </form.Field>
                        </FormField>

                        <FormField>
                          <Label className="required">
                            Visual Element Locator
                          </Label>
                          <form.Field
                            name={`visualElements[${i}].locator_type`}
                          >
                            {(f) => (
                              <>
                                <SingleSelect
                                  name="locator type"
                                  options={[
                                    { value: "ref", label: "Ref" },
                                    { value: "many", label: "Many" },
                                    {
                                      value: "uncatalogued",
                                      label: "Uncatalogued",
                                    },
                                  ]}
                                  value={f.state.value}
                                  onChange={(value) => {
                                    f.handleChange(
                                      (value as string | null) || "",
                                    );
                                    if (value === "ref") {
                                      form.setFieldValue(
                                        `visualElements[${i}].locator`,
                                        {
                                          key: getSuggestedKey(),
                                          first_order_type: null,
                                          first_order_value: null,
                                          type: null,
                                          value: "",
                                          page_type: "",
                                          page_value: null,
                                        },
                                      );
                                    } else {
                                      form.setFieldValue(
                                        `visualElements[${i}].locator`,
                                        null,
                                      );
                                    }
                                  }}
                                  onBlur={f.handleBlur}
                                />
                                {!f.state.meta.isValid && (
                                  <em>{f.state.meta.errors.join(", ")}</em>
                                )}
                              </>
                            )}
                          </form.Field>
                        </FormField>

                        {field.state.value[i].locator_type === "ref" && (
                          <>
                            <FormField>
                              <Label>First Order Type</Label>
                              <form.Field
                                name={`visualElements[${i}].locator.first_order_type`}
                              >
                                {(f) => (
                                  <SingleSelect
                                    name="first order type"
                                    options={[
                                      { value: "book", label: "Book" },
                                      { value: "section", label: "Section" },
                                    ]}
                                    onChange={(value) =>
                                      f.handleChange(value as string | null)
                                    }
                                    value={f.state.value || ""}
                                    onBlur={f.handleBlur}
                                  />
                                )}
                              </form.Field>
                            </FormField>

                            <FormField>
                              <Label>First Order Value</Label>
                              <form.Field
                                name={`visualElements[${i}].locator.first_order_value`}
                                validators={{
                                  onBlur: ({ value }) => {
                                    if (
                                      field.state.value[i].locator
                                        ?.first_order_type &&
                                      !value
                                    ) {
                                      return "First order value is required when first order type is specified";
                                    }
                                    if (
                                      field.state.value[i].locator &&
                                      !field.state.value[i].locator
                                        .first_order_type &&
                                      value
                                    ) {
                                      return "First order value is cannot be set when first order type is not specified";
                                    }
                                  },
                                }}
                              >
                                {(f) => (
                                  <>
                                    <Input
                                      type="text"
                                      value={f.state.value || ""}
                                      onChange={(e) =>
                                        f.handleChange(e.target.value || null)
                                      }
                                      onBlur={f.handleBlur}
                                      placeholder="e.g. book number or name"
                                    />
                                    {!f.state.meta.isValid && (
                                      <em>{f.state.meta.errors.join(", ")}</em>
                                    )}
                                  </>
                                )}
                              </form.Field>
                            </FormField>

                            <FormField>
                              <Label>Locator Type</Label>
                              <form.Field
                                name={`visualElements[${i}].locator.type`}
                              >
                                {(f) => (
                                  <SingleSelect
                                    name="locator type"
                                    options={
                                      lists?.locatorTypes?.map((t) => ({
                                        value: t,
                                        label: t,
                                      })) || []
                                    }
                                    onChange={(value) => {
                                      const strValue = (value || "") as string;
                                      if (
                                        strValue &&
                                        !lists?.locatorTypes?.includes(strValue)
                                      ) {
                                        setLists(
                                          (l) =>
                                            ({
                                              ...l,
                                              locatorTypes: [
                                                ...(l!.locatorTypes || []),
                                                strValue,
                                              ],
                                            }) as typeof lists,
                                        );
                                      }
                                      f.handleChange(strValue);
                                    }}
                                    isCreatable
                                    value={f.state.value || ""}
                                    onBlur={f.handleBlur}
                                  />
                                )}
                              </form.Field>
                            </FormField>

                            <FormField>
                              <Label className="required">Locator Value</Label>
                              <form.Field
                                name={`visualElements[${i}].locator.value`}
                                validators={{
                                  onBlur: ({ value }) =>
                                    !value && "Locator value is required",
                                }}
                              >
                                {(f) => (
                                  <>
                                    <Input
                                      type="text"
                                      value={f.state.value || ""}
                                      onChange={(e) =>
                                        f.handleChange(e.target.value || null)
                                      }
                                      onBlur={f.handleBlur}
                                      placeholder="e.g. book number or name"
                                    />
                                    {!f.state.meta.isValid && (
                                      <em>{f.state.meta.errors.join(", ")}</em>
                                    )}
                                  </>
                                )}
                              </form.Field>
                            </FormField>

                            <FormField>
                              <Label>Page Type</Label>
                              <form.Field
                                name={`visualElements[${i}].locator.page_type`}
                              >
                                {(f) => (
                                  <>
                                    <SingleSelect
                                      name="page type"
                                      options={[
                                        { value: "page", label: "Page" },
                                        { value: "folio", label: "Folio" },
                                        {
                                          value: "page_range",
                                          label: "Page range",
                                        },
                                        {
                                          value: "folio_range",
                                          label: "Folio range",
                                        },
                                        {
                                          value: "facsimile_page",
                                          label: "Facsimile Page",
                                        },
                                        {
                                          value: "facsimile_page_range",
                                          label: "Facsimile Page range",
                                        },
                                      ]}
                                      onChange={(value) => {
                                        const strValue = value as string | null;
                                        f.handleChange(strValue);
                                      }}
                                      value={f.state.value || ""}
                                      onBlur={f.handleBlur}
                                    />
                                    {!f.state.meta.isValid && (
                                      <em>{f.state.meta.errors.join(", ")}</em>
                                    )}
                                  </>
                                )}
                              </form.Field>
                            </FormField>

                            <FormField>
                              <Label>Page Value</Label>
                              <form.Field
                                name={`visualElements[${i}].locator.page_value`}
                                validators={{
                                  onBlur: ({ value }) => {
                                    if (
                                      ["page", "facsimile_page"].includes(
                                        field.state.value[i].locator
                                          ?.page_type || "",
                                      ) &&
                                      !/^(\d+(-\d+)?)(,(\d+(-\d+)?))*$/.test(
                                        value || "",
                                      )
                                    ) {
                                      return "Value must be a comma separated list of page numbers or ranges (e.g., 12,14-16,18)";
                                    }
                                    if (
                                      [
                                        "page_range",
                                        "facsimile_page_range",
                                      ].includes(
                                        field.state.value[i].locator
                                          ?.page_type || "",
                                      ) &&
                                      !/^\d+v?$/.test(value || "")
                                    ) {
                                      return "Value must be a single folio or page number (e.g., 12 or 12v)";
                                    }
                                    return (
                                      !field.state.value[i].locator
                                        ?.page_type &&
                                      value &&
                                      "Page value cannot be set when page type is not specified"
                                    );
                                  },
                                }}
                              >
                                {(f) => (
                                  <>
                                    {" "}
                                    <Input
                                      type="text"
                                      value={f.state.value || ""}
                                      onChange={(e) =>
                                        f.handleChange(e.target.value || null)
                                      }
                                      onBlur={f.handleBlur}
                                      placeholder="Page number or reference"
                                    />
                                    {!f.state.meta.isValid && (
                                      <em>{f.state.meta.errors.join(", ")}</em>
                                    )}
                                  </>
                                )}
                              </form.Field>
                            </FormField>
                          </>
                        )}

                        <form.Field name={`visualElements[${i}].examples`}>
                          {(examplesField) => (
                            <>
                              <FormField className="full-width">
                                <Label>Examples</Label>
                                <button
                                  style={{
                                    padding: 4,
                                    width: "fit-content",
                                    cursor: "pointer",
                                  }}
                                  type="button"
                                  onClick={() =>
                                    examplesField.pushValue({
                                      img: "",
                                      has_locator: false,
                                      locator: null,
                                    })
                                  }
                                >
                                  Add example
                                </button>
                              </FormField>
                              {examplesField.state.value.map((_, j) => (
                                <FormField key={j} gap={0.5} bgColor="#F0F8FF">
                                  <FormField>
                                    <form.Field
                                      name={`visualElements[${i}].examples[${j}].img`}
                                    >
                                      {(f) => (
                                        <>
                                          <Label>
                                            Example Image{" "}
                                            {f.state.value && (
                                              <SelectedImage>
                                                Image is set
                                              </SelectedImage>
                                            )}
                                          </Label>
                                          <FileInput
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              if (!e.target.files?.[0]) {
                                                f.handleChange("");
                                              } else {
                                                const id = uniqueId();
                                                setImages((m) => ({
                                                  ...m,
                                                  [id]: e.target.files![0],
                                                }));
                                                f.handleChange(id);
                                              }
                                            }}
                                          />
                                          {f.state.value &&
                                            images[f.state.value] && (
                                              <div>
                                                <SelectedImage>
                                                  Selected:{" "}
                                                  {images[f.state.value].name}
                                                </SelectedImage>
                                              </div>
                                            )}
                                        </>
                                      )}
                                    </form.Field>
                                  </FormField>

                                  <FormField width="max-content">
                                    <Label>Specify Locator</Label>
                                    <form.Field
                                      name={`visualElements[${i}].examples[${j}].has_locator`}
                                    >
                                      {(f) => (
                                        <Row justifyStart gap={1}>
                                          <Input
                                            type="checkbox"
                                            checked={f.state.value}
                                            onChange={(e) => {
                                              f.handleChange(e.target.checked);
                                              if (e.target.checked) {
                                                form.setFieldValue(
                                                  `visualElements[${i}].examples[${j}].locator`,
                                                  {
                                                    key: getSuggestedKey(),
                                                    first_order_type: null,
                                                    first_order_value: null,
                                                    type: null,
                                                    value: "",
                                                    page_type: "",
                                                    page_value: null,
                                                  },
                                                );
                                              } else {
                                                form.setFieldValue(
                                                  `visualElements[${i}].examples[${j}].locator`,
                                                  null,
                                                );
                                              }
                                            }}
                                            onBlur={f.handleBlur}
                                          />
                                          <Label
                                            muted
                                            onClick={() => {
                                              const newValue = !f.state.value;
                                              f.handleChange(newValue);
                                              if (newValue) {
                                                form.setFieldValue(
                                                  `visualElements[${i}].examples[${j}].locator`,
                                                  {
                                                    key: getSuggestedKey(),
                                                    first_order_type: null,
                                                    first_order_value: null,
                                                    type: null,
                                                    value: "",
                                                    page_type: "",
                                                    page_value: null,
                                                  },
                                                );
                                              } else {
                                                form.setFieldValue(
                                                  `visualElements[${i}].examples[${j}].locator`,
                                                  null,
                                                );
                                              }
                                            }}
                                          >
                                            Check to add locator details for
                                            this example
                                          </Label>
                                        </Row>
                                      )}
                                    </form.Field>
                                  </FormField>

                                  {examplesField.state.value[j].has_locator && (
                                    <>
                                      <FormField>
                                        <Label>First Order Type</Label>
                                        <form.Field
                                          name={`visualElements[${i}].examples[${j}].locator.first_order_type`}
                                        >
                                          {(f) => (
                                            <SingleSelect
                                              name="first order type"
                                              options={[
                                                {
                                                  value: "book",
                                                  label: "Book",
                                                },
                                                {
                                                  value: "section",
                                                  label: "Section",
                                                },
                                              ]}
                                              onChange={(value) =>
                                                f.handleChange(
                                                  value as string | null,
                                                )
                                              }
                                              value={f.state.value || ""}
                                              onBlur={f.handleBlur}
                                            />
                                          )}
                                        </form.Field>
                                      </FormField>

                                      <FormField>
                                        <Label>First Order Value</Label>
                                        <form.Field
                                          name={`visualElements[${i}].examples[${j}].locator.first_order_value`}
                                          validators={{
                                            onBlur: ({ value }) => {
                                              if (
                                                examplesField.state.value[j]
                                                  .locator?.first_order_type &&
                                                !value
                                              ) {
                                                return "First order value is required when first order type is specified";
                                              }
                                              if (
                                                examplesField.state.value[j]
                                                  .locator &&
                                                !examplesField.state.value[j]
                                                  .locator.first_order_type &&
                                                value
                                              ) {
                                                return "First order value is cannot be set when first order type is not specified";
                                              }
                                            },
                                          }}
                                        >
                                          {(f) => (
                                            <>
                                              <Input
                                                type="text"
                                                value={f.state.value || ""}
                                                onChange={(e) =>
                                                  f.handleChange(
                                                    e.target.value || null,
                                                  )
                                                }
                                                onBlur={f.handleBlur}
                                                placeholder="e.g. book number or name"
                                              />
                                              {!f.state.meta.isValid && (
                                                <em>
                                                  {f.state.meta.errors.join(
                                                    ", ",
                                                  )}
                                                </em>
                                              )}
                                            </>
                                          )}
                                        </form.Field>
                                      </FormField>

                                      <FormField>
                                        <Label>Locator Type</Label>
                                        <form.Field
                                          name={`visualElements[${i}].examples[${j}].locator.type`}
                                        >
                                          {(f) => (
                                            <SingleSelect
                                              name="locator type"
                                              options={
                                                lists?.locatorTypes?.map(
                                                  (t) => ({
                                                    value: t,
                                                    label: t,
                                                  }),
                                                ) || []
                                              }
                                              onChange={(value) => {
                                                const strValue = (value ||
                                                  "") as string;
                                                if (
                                                  strValue &&
                                                  !lists?.locatorTypes?.includes(
                                                    strValue,
                                                  )
                                                ) {
                                                  setLists(
                                                    (l) =>
                                                      ({
                                                        ...l,
                                                        locatorTypes: [
                                                          ...(l!.locatorTypes ||
                                                            []),
                                                          strValue,
                                                        ],
                                                      }) as typeof lists,
                                                  );
                                                }
                                                f.handleChange(strValue);
                                              }}
                                              isCreatable
                                              value={f.state.value || ""}
                                              onBlur={f.handleBlur}
                                            />
                                          )}
                                        </form.Field>
                                      </FormField>

                                      <FormField>
                                        <Label className="required">
                                          Locator Value
                                        </Label>
                                        <form.Field
                                          name={`visualElements[${i}].examples[${j}].locator.value`}
                                          validators={{
                                            onBlur: ({ value }) =>
                                              !value &&
                                              "Locator value is required",
                                          }}
                                        >
                                          {(f) => (
                                            <>
                                              <Input
                                                type="text"
                                                value={f.state.value || ""}
                                                onChange={(e) =>
                                                  f.handleChange(
                                                    e.target.value || null,
                                                  )
                                                }
                                                onBlur={f.handleBlur}
                                                placeholder="e.g. book number or name"
                                              />
                                              {!f.state.meta.isValid && (
                                                <em>
                                                  {f.state.meta.errors.join(
                                                    ", ",
                                                  )}
                                                </em>
                                              )}
                                            </>
                                          )}
                                        </form.Field>
                                      </FormField>

                                      <FormField>
                                        <Label>Page Type</Label>
                                        <form.Field
                                          name={`visualElements[${i}].examples[${j}].locator.page_type`}
                                        >
                                          {(f) => (
                                            <>
                                              <SingleSelect
                                                name="page type"
                                                options={[
                                                  {
                                                    value: "page",
                                                    label: "Page",
                                                  },
                                                  {
                                                    value: "folio",
                                                    label: "Folio",
                                                  },
                                                  {
                                                    value: "page_range",
                                                    label: "Page range",
                                                  },
                                                  {
                                                    value: "folio_range",
                                                    label: "Folio range",
                                                  },
                                                  {
                                                    value: "facsimile_page",
                                                    label: "Facsimile Page",
                                                  },
                                                  {
                                                    value:
                                                      "facsimile_page_range",
                                                    label:
                                                      "Facsimile Page range",
                                                  },
                                                ]}
                                                onChange={(value) => {
                                                  const strValue = value as
                                                    | string
                                                    | null;
                                                  f.handleChange(strValue);
                                                }}
                                                value={f.state.value || ""}
                                                onBlur={f.handleBlur}
                                              />
                                              {!f.state.meta.isValid && (
                                                <em>
                                                  {f.state.meta.errors.join(
                                                    ", ",
                                                  )}
                                                </em>
                                              )}
                                            </>
                                          )}
                                        </form.Field>
                                      </FormField>

                                      <FormField>
                                        <Label>Page Value</Label>
                                        <form.Field
                                          name={`visualElements[${i}].examples[${j}].locator.page_value`}
                                          validators={{
                                            onBlur: ({ value }) => {
                                              if (
                                                [
                                                  "page",
                                                  "facsimile_page",
                                                ].includes(
                                                  examplesField.state.value[j]
                                                    .locator?.page_type || "",
                                                ) &&
                                                !/^(\d+(-\d+)?)(,(\d+(-\d+)?))*$/.test(
                                                  value || "",
                                                )
                                              ) {
                                                return "Value must be a comma separated list of page numbers or ranges (e.g., 12,14-16,18)";
                                              }
                                              if (
                                                [
                                                  "page_range",
                                                  "facsimile_page_range",
                                                ].includes(
                                                  examplesField.state.value[j]
                                                    .locator?.page_type || "",
                                                ) &&
                                                !/^\d+v?$/.test(value || "")
                                              ) {
                                                return "Value must be a single folio or page number (e.g., 12 or 12v)";
                                              }
                                              return (
                                                !examplesField.state.value[j]
                                                  .locator?.page_type &&
                                                value &&
                                                "Page value cannot be set when page type is not specified"
                                              );
                                            },
                                          }}
                                        >
                                          {(f) => (
                                            <>
                                              <Input
                                                type="text"
                                                value={f.state.value || ""}
                                                onChange={(e) =>
                                                  f.handleChange(
                                                    e.target.value || null,
                                                  )
                                                }
                                                onBlur={f.handleBlur}
                                                placeholder="Page number or reference"
                                              />
                                              {!f.state.meta.isValid && (
                                                <em>
                                                  {f.state.meta.errors.join(
                                                    ", ",
                                                  )}
                                                </em>
                                              )}
                                            </>
                                          )}
                                        </form.Field>
                                      </FormField>
                                    </>
                                  )}

                                  <RemoveButton
                                    type="button"
                                    onClick={() => examplesField.removeValue(j)}
                                  >
                                    Remove Example
                                  </RemoveButton>
                                </FormField>
                              ))}
                            </>
                          )}
                        </form.Field>

                        <FormField>
                          <Label>Notes</Label>
                          <form.Field name={`visualElements[${i}].notes`}>
                            {(f) => (
                              <TextArea
                                value={f.state.value}
                                onChange={(e) => f.handleChange(e.target.value)}
                                onBlur={f.handleBlur}
                                placeholder="Additional notes about this visual element"
                              />
                            )}
                          </form.Field>
                        </FormField>

                        <RemoveButton
                          type="button"
                          onClick={() => field.removeValue(i)}
                        >
                          Remove Visual Element
                        </RemoveButton>
                      </FormField>
                    ))}
                  </>
                )}
              </form.Field>

              <FormField className="full-width">
                <Label>Notes</Label>
                <form.Field name="notes">
                  {(field) => (
                    <TextArea
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  )}
                </form.Field>
              </FormField>

              <FormField width="max-content">
                <Label>Verified</Label>
                <Row justifyStart gap={1}>
                  <form.Field name="verified">
                    {(field) => (
                      <>
                        <Input
                          type="checkbox"
                          checked={field.state.value}
                          onChange={(e) => field.handleChange(e.target.checked)}
                          onBlur={field.handleBlur}
                        />
                        <Label
                          muted
                          onClick={() => field.handleChange(!field.state.value)}
                        >
                          Only check this option if you verified the entry.
                        </Label>
                      </>
                    )}
                  </form.Field>
                </Row>
              </FormField>
            </FormGrid>

            <ButtonContainer>
              <SubmitButton type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? key
                    ? "Updating..."
                    : "Adding..."
                  : key
                    ? "Update"
                    : "Add"}
              </SubmitButton>
            </ButtonContainer>
          </form>
        )}
      </FormContainer>
    </PageContainer>
  );
};
