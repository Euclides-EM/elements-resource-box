import { FilterGroup, Range } from "../types";
import { compareBookStatementRef } from "../types/book_statement_ref.ts";
import { NO_CITY } from "./index.ts";

export type ItemProperty = {
  displayName: string;
  filterGroup?: FilterGroup | "General";
  isArray?: boolean;
  customCompareFn?: (a: unknown, b: unknown) => number;
  isTitlePageImageFeature?: boolean;
  isTitlePageTextFeature?: boolean;
  groupByJoinArray?: boolean;
  notFilterable?: boolean;
  notGroupable?: boolean;
};

function parseRangeIfNeeded(a: Range | string): Range {
  if (!(typeof a === "string")) {
    return a;
  }
  if (a === "None") {
    return { start: 100, end: 100 };
  }
  const parts = (a as string).split("-");
  return {
    start: parseInt(parts[0]),
    end: parseInt(parts[parts.length - 1]),
  };
}

export const itemProperties: {
  [key: string]: ItemProperty;
} = {
  type: {
    displayName: "Book Classification",
  },
  languages: {
    displayName: "Languages",
    isArray: true,
    groupByJoinArray: true,
  },
  cities: {
    displayName: "Cities",
    isArray: true,
    customCompareFn: ((a: string, b: string) => {
      if (a === NO_CITY) {
        return -1;
      }
      if (b === NO_CITY) {
        return 1;
      }
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    }) as (a: unknown, b: unknown) => number,
    groupByJoinArray: true,
  },
  authors: {
    displayName: "Authors",
    isArray: true,
    groupByJoinArray: true,
  },
  elementsBooks: {
    displayName: "Elements Books (ranges)",
    filterGroup: "Elements",
    isArray: true,
    notFilterable: true,
    customCompareFn: ((a: Range | string, b: Range | string) => {
      const rangeA: Range = parseRangeIfNeeded(a);
      const rangeB: Range = parseRangeIfNeeded(b);
      if (rangeA.start === rangeB.start) {
        return rangeA.end - rangeB.end;
      }
      return rangeA.start - rangeB.start;
    }) as (a: unknown, b: unknown) => number,
  },
  elementsBooksExpanded: {
    displayName: "Elements Books",
    filterGroup: "Elements",
    isArray: true,
    customCompareFn: ((a: string, b: string): number => {
      if (a === "None") return 1;
      if (b === "None") return -1;
      const numA = parseInt(a);
      const numB = parseInt(b);
      return numA - numB;
    }) as (a: unknown, b: unknown) => number,
  },
  additionalContent: {
    displayName: "Additional Content",
    filterGroup: "Elements",
    isArray: true,
  },
  class: {
    displayName: "Wardhaugh Class",
    filterGroup: "Elements",
  },
  diagrams_extracted: {
    displayName: "Diagrams Extracted",
    filterGroup: "Diagrams",
  },
  has_diagrams: {
    displayName: "Has Diagrams",
    filterGroup: "Diagrams",
  },
  dotted_lines_b79_cases: {
    displayName: "Case: Token Lines VII-IX",
    filterGroup: "Diagrams",
  },
  dotted_lines_b10_case: {
    displayName: "Case: Token Units X",
    filterGroup: "Diagrams",
  },
  dotted_lines_b2_cases: {
    displayName: "Case: Non-geo Dotted Variation II",
    filterGroup: "Diagrams",
    isArray: true,
    customCompareFn: compareBookStatementRef,
  },
  dotted_lines_geo_cases: {
    displayName: "Case: Geo Dotted",
    filterGroup: "Diagrams",
    isArray: true,
    customCompareFn: compareBookStatementRef,
  },
  dotted_lines_other_cases: {
    displayName: "Case: Dotted (Other)",
    filterGroup: "Diagrams",
    isArray: true,
    customCompareFn: compareBookStatementRef,
  },
  dotted_lines_cases: {
    displayName: "Dotted Lines Cases",
    filterGroup: "Diagrams",
    isArray: true,
    notFilterable: true,
    customCompareFn: compareBookStatementRef,
  },
  study_corpora: {
    displayName: "Study Corpus",
    isArray: true,
  },
  format: {
    displayName: "Edition Format",
    filterGroup: "Material",
  },
  volumesCount: {
    displayName: "Number of Volumes",
    filterGroup: "Material",
  },
  hasTitle: {
    displayName: "Has Title Page",
    filterGroup: "Title Page",
  },
  colorInTitle: {
    displayName: "Colors on Title Page",
    filterGroup: "Title Page",
    isTitlePageImageFeature: true,
  },
  titlePageDesign: {
    displayName: "Title Page Design",
    filterGroup: "Title Page",
    isTitlePageImageFeature: true,
  },
  titlePageNumberOfTypes: {
    displayName: "Number of Types on Title Page",
    filterGroup: "Title Page",
    isTitlePageImageFeature: true,
    customCompareFn: ((a: string | null, b: string | null): number => {
      if (a?.includes("Digital")) {
        return 1;
      }
      if (b?.includes("Digital")) {
        return -1;
      }
      const aNum = parseInt(a || "0");
      const bNum = parseInt(b || "0");
      return aNum - bNum;
    }) as (a: unknown, b: unknown) => number,
  },
  titlePageFrameType: {
    displayName: "Frame Type of Title Page",
    filterGroup: "Title Page",
    isTitlePageImageFeature: true,
  },
  titlePageEngraving: {
    displayName: "Title Page Engraving",
    filterGroup: "Title Page",
    isTitlePageImageFeature: true,
  },
  fontTypes: {
    displayName: "Types Present on Title Page",
    filterGroup: "Title Page",
    isTitlePageImageFeature: true,
    isArray: true,
  },
  otherNames: {
    displayName: "Educational Mentioned Authority on Title Page",
    filterGroup: "Title Page",
    isArray: true,
  },
  tp_illustration: {
    displayName: "Illustration on Title Page",
    filterGroup: "Title Page",
  },
  otherNamesClassification: {
    displayName: "Other Educational Authorities Mentioned on Title Page",
    filterGroup: "Title Page",
    isArray: true,
    notFilterable: true,
    isTitlePageTextFeature: true,
  },
  hasIntendedAudience: {
    displayName: "Intended Audience Mentioned on Title Page",
    filterGroup: "Title Page",
    notFilterable: true,
    isTitlePageTextFeature: true,
  },
  hasPatronageDedication: {
    displayName: "Patronage Dedication Present on Title Page",
    filterGroup: "Title Page",
    notFilterable: true,
    isTitlePageTextFeature: true,
  },
  hasAdapterAttribution: {
    displayName: "Adapter Attribution Present on Title Page",
    filterGroup: "Title Page",
    notFilterable: true,
    isTitlePageTextFeature: true,
  },
  hasAdapterDescription: {
    displayName: "Adapter Description Present on Title Page",
    filterGroup: "Title Page",
    notFilterable: true,
    isTitlePageTextFeature: true,
  },
  hasPublishingPrivileges: {
    displayName: "Publishing Privileges Present on Title Page",
    filterGroup: "Title Page",
    notFilterable: true,
    isTitlePageTextFeature: true,
  },
  hasGreekDesignation: {
    displayName: "Greek Designation Present on Title Page",
    filterGroup: "Title Page",
    notFilterable: true,
    isTitlePageTextFeature: true,
  },
  explicitLanguageReferences: {
    displayName: "Explicit Language References on Title Page",
    filterGroup: "Title Page",
    isArray: true,
    notFilterable: true,
    isTitlePageTextFeature: true,
  },
  institutions: {
    displayName: "Institutions Mentioned on Title Page",
    filterGroup: "Title Page",
    isArray: true,
    notFilterable: true,
    isTitlePageTextFeature: true,
  },
};
