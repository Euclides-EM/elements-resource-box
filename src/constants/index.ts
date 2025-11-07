import { Feature } from "../types";

export const CSV_PATH_ELEMENTS = "/docs/EiP.csv";
export const CSV_PATH_SECONDARY = "/docs/EiP-secondary.csv";
export const CSV_PATH_CITIES = "/docs/cities.csv";
export const CSV_PATH_DOTTED_LINES = "/docs/dotted_lines.csv";
export const CSV_PATH_COPIES = "/docs/copies.csv";

export const TILE_HEIGHT = 400;
export const TILE_WIDTH = 400;

export const MIN_YEAR = 1482;
export const MAX_YEAR = 1705;

export const MACTUTOR_URL = "https://mactutor-index.netlify.app";
export const EIP_URL = "https://bibsoc.org.uk/euclid-print-1482-1703/";

const FACSIMILE_REPO_SLUG = "ReallyLiri/elements-facsimile";
export const GITHUB_CONTENT_URL = `https://github.com/${FACSIMILE_REPO_SLUG}/raw/main`;
export const DIAGRAMS_PATH_BASE = "docs/diagrams";
export const DIAGRAMS_CROPS_FOLDER = "crops";

export const ItemTypes = {
  elements: "Elements",
  secondary: "Other",
};

export const NO_CITY = "s.l.";
export const NO_YEAR = "s.d.";
export const NO_AUTHOR = "s.n.";

export const FeatureToColumnName: Record<Feature, string[]> = {
  "Elements Designation": ["Elements_designation"],
  "Base Content": ["base_content"],
  "Base Content Description": ["content_description"],
  "Adapter Attribution": ["editor_name"],
  "Adapter Description": ["editor_description"],
  "Patronage Dedication": ["dedicatee_name"],
  "Edition Statement": ["edition_details"],
  "Supplementary Content": ["additional_content"],
  "Publishing Privileges": ["printing_privilege"],
  "Euclid References": ["references_to_Euclid"],
  "Other Educational Authorities": ["educational_authorities_references"],
  "Explicit Language References": [
    "origin_language",
    "destination_language",
  ],
  "Euclid Description": ["description_of_Euclid"],
  Verbs: ["action_verbs"],
  "Intended Audience": ["audience"],
  "Greek designation": ["Greek_text"],
  Institutions: ["institutions"],
  "Bound With": ["bound_with"],
  "Enriched With": ["enriched_with"],
  "Date in Imprint": ["date_in_imprint"],
  "Publisher in Imprint": ["publisher_in_imprint"],
  "Place in Imprint": ["location_in_imprint"],
  "Privileges in Imprint": ["printing_privilege_in_imprint"],
  "Dedication in Imprint": ["dedication_in_imprint"],
  "Adapter Attribution in Imprint": ["editor_in_imprint"],
  "Adapter Description in Imprint": ["editor_description_in_imprint"],
};

export const FeaturesToSplit: Partial<Record<Feature, boolean>> = {
  "Euclid References": true,
  "Other Educational Authorities": true,
  "Explicit Language References": true,
  Verbs: true,
  Institutions: true,
  "Elements Designation": true,
  "Bound With": true,
  "Enriched With": true,
  "Publisher in Imprint": true,
  "Privileges in Imprint": true,
  "Place in Imprint": true,
};

export const FeaturesNotSelectedByDefault: Feature[] = [
  "Greek designation",
  "Elements Designation",
  "Base Content Description",
  "Supplementary Content",
  "Date in Imprint",
  "Publisher in Imprint",
  "Place in Imprint",
  "Privileges in Imprint",
  "Dedication in Imprint",
  "Adapter Attribution in Imprint",
  "Adapter Description in Imprint",
];

export const FeatureToColor: Record<Feature, string> = {
  "Base Content": "#FADADD",
  "Base Content Description": "#AEC6CF",
  "Adapter Attribution": "#909fd7",
  "Adapter Description": "#FFDAB9",
  "Patronage Dedication": "#D4C5F9",
  "Edition Statement": "#FFC1CC",
  "Supplementary Content": "#9783d2",
  "Publishing Privileges": "#D1E7E0",
  "Euclid References": "#F0E68C",
  "Other Educational Authorities": "#e567ac",
  "Explicit Language References": "#e59c67",
  "Euclid Description": "#b0e57c",
  Verbs: "#954caf",
  "Intended Audience": "#E4A0D8",
  "Elements Designation": "#A3D5C3",
  "Greek designation": "#F0B2A1",
  Institutions: "#B0C4DE",
  "Bound With": "#FFB6C1",
  "Enriched With": "#D3D3D3",
  "Date in Imprint": "#FFDEAD",
  "Publisher in Imprint": "#ADD8E6",
  "Place in Imprint": "#E6E6FA",
  "Privileges in Imprint": "#D1E7E0",
  "Dedication in Imprint": "#D4C5F9",
  "Adapter Attribution in Imprint": "#909fd7",
  "Adapter Description in Imprint": "#FFDAB9",
};

export const FeatureToTooltip: Record<Feature, string> = {
  "Base Content":
    "The minimal designation of the book’s main content, typically appearing at the beginning of the title page, without elaboration.",
  "Base Content Description":
    "Additional elements extending beyond the base content, describing it or highlighting the book’s special features.",
  "Adapter Attribution":
    "The name of the contemporary adapter (author, editor, translator, commentator, etc.) as it appears on the title page.",
  "Adapter Description":
    "Any descriptors found alongside the adapter name, such as academic titles, ranks, or affiliations.",
  "Patronage Dedication": "Mentions of patrons.",
  "Edition Statement":
    "Any information that is highlighted as relevant for this specific edition.",
  "Supplementary Content": "Additional content included in the book.",
  "Publishing Privileges":
    "Mentions of royal privileges or legal permissions granted for printing.",
  "Euclid References": "Euclid's name as it appears on the title page.",
  "Other Educational Authorities":
    "Mentions of other scholars, either ancients, such as Theon of Alexandria, or contemporary, like Simon Stevin.",
  "Euclid Description":
    "Any descriptors found alongside the Euclid's name, such as mentioning him being a mathematician.",
  "Explicit Language References":
    "Mentions of the source language (e.g., Latin or Greek) and/or the target language.",
  Verbs:
    "Action verbs such as traduit (translated), commenté (commented), augmenté (expanded) that describe the role the contemporary scholar played in bringing about the work.",
  "Intended Audience":
    "Explicit mentions of the work's intended recipients or audience.",
  "Elements Designation":
    "The designation of the Elements, such as 'Elements of Geometry' or 'Euclid’s Elements', as it appears on the title page.",
  "Greek designation": "Greek designation of the book in non-Greek books.",
  Institutions:
    "Mentions of institutions, such as societies or universities, associated with the book.",
  "Bound With":
    "Mentions of other works included in the book, such as 'Optics'.",
  "Enriched With":
    "Mentions of additional content that is not part of the core text that enriches the text and makes it more understandable, accurate, or useful.",
  "Date in Imprint":
    "The date of publication as it appears on the title page, typically in the form of a year.",
  "Publisher in Imprint":
    "The name of the publisher or printer as it appears on the title page.",
  "Place in Imprint":
    "The place of publication as it appears on the title page, typically a city.",
  "Privileges in Imprint":
    "Mentions of royal privileges or legal permissions granted for printing, such as 'by royal permission' or 'with the approval of the censor'.",
  "Dedication in Imprint":
    "Mentions of dedications to patrons or other individuals, typically found on the title page or in the preface.",
  "Adapter Attribution in Imprint":
    "The name of the author as it appears on the title page, typically in the form of 'by [Author Name]'.",
  "Adapter Description in Imprint":
    "Any descriptors found alongside the author name, such as academic titles, ranks, or affiliations.",
};
