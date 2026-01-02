export const CSV_PATH_ITEMS_MANUSCRIPT = "/docs/items_manuscript.csv";
export type ManuscriptDetails = {
  key: string;
  short_title: string | null;
  short_title_source: string | null;
  year_from: string | null;
  year_to: string | null;
  notes: string | null;
  has_diagrams: boolean | null;
};

export const CSV_PATH_MD_MANUSCRIPT = "/docs/metadata_elements_manuscripts.csv";
export type ManuscriptElementsMetadata = {
  key: string;
  class: string;
  subclass: string | null;
  elements_books: string | null;
};

export const CSV_PATH_CITIES = "/docs/cities.csv";
export type City = {
  city: string;
  lon: number;
  lat: number;
};

export const CSV_PATH_DOTTED_LINES = "/docs/dotted_lines.csv";
export type DottedLine = {
  key: string;
  type: string;
  has_diagrams: string;
  uc_b79_token: string;
  uc_b10: string;
  uc_b2: string;
  uc_geo_dotted: string;
  uc_other: string;
  quality: string;
};

export const CSV_PATH_ITEMS_PRINT = "/docs/items_print.csv";
export type PrintDetails = {
  key: string;
  short_title: string | null;
  short_title_source: string | null;
  year: string | null;
  city: string | null;
  language: string;
  author_or_editor: string | null;
  publisher: string | null;
  format: string | null;
  volumes: string | null;
  ustc_id: string | null;
  notes: string | null;
  has_diagrams: boolean | null;
};

export const CSV_PATH_TRANSCRIPTIONS = "/docs/paratext_transcriptions.csv";
export type ParatextTranscriptions = {
  key: string;
  title: string | null;
  imprint: string | null;
  colophon: string | null;
  frontispiece: string | null;
};

export const CSV_PATH_TRANSLATIONS = "/docs/translations.csv";
export type ParatextTranslations = {
  key: string;
  field: "title" | "imprint" | "colophon" | "frontispiece";
  en: string;
  source: string;
};

export const CSV_PATH_SHELFMARKS = "/docs/shelfmarks.csv";
export type Shelfmarks = {
  key: string;
  volume: string | null;
  scan: string | null;
  title_page_img: string | null;
  frontispiece_img: string | null;
  annotations: string | null;
  shelf_mark: string | null;
  copyright: string | null;
};

export const CSV_PATH_MD_PRINT = "/docs/metadata_elements_print.csv";
export type PrintElementsMetadata = {
  key: string;
  elements_books: string | null;
  additional_content: string | null;
  wardhaugh_classification: string | null;
};

export const CSV_PATH_CORPUSES = "/docs/corpuses.csv";
export type StudyCorpuses = {
  key: string;
  study: string;
};

export const CSV_PATH_TITLE_PAGE_FEATURES = "/docs/title_page.csv";

export const CSV_PATH_REVIEWS = "/docs/reviews.csv";
export type Review = {
  key: string;
  researcher: string;
  timestamp: string;
};

export const CSV_PATH_BIBLIOGRAPHY = "/docs/bibliography.csv";
export type BibliographyEntry = {
  key: string;
  citation: string;
};

export const CSV_PATH_CLUSTERS = "/docs/clusters.csv";
export type ClusterEntry = {
  key: string;
  type: string;
};

export const CSV_PATH_CLUSTER_ITEMS = "/docs/cluster_items.csv";
export type ClusterItem = {
  cluster_key: string;
  item_key: string;
};

export const CSV_PATH_VISUAL_ELEMENTS = "/docs/visual_elements.csv";
export type VisualElement = {
  key: string;
  visual_element_type: string;
  locator_type: string;
  locator_key: string | null;
  notes: string | null;
};

export const CSV_PATH_VISUAL_ELEMENTS_EXAMPLES =
  "/docs/visual_elements_examples.csv";
export type VisualElementExample = {
  key: string;
  path: string;
  locator_key: string | null;
};

export const CSV_PATH_LOCATORS = "/docs/locators.csv";
export type Locator = {
  key: string;
  first_order_type: string | null;
  first_order_value: string | null;
  type: string | null;
  value: string;
  page_type: string;
  page_value: string | null;
};
