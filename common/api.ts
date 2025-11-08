export const NOTES_API_PATH = "/api/notes/";

export interface NotesRequestBody {
  note: string;
}

export const IMAGE_UPLOAD_API_PATH = "/api/upload-image";

export const EDITION_API_PATH = "/api/edition";

export const REPO_PULL_API_PATH = "/repo/pull";
export const REPO_PR_API_PATH = "/repo/pr";

export type EditionRequestBody = {
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
} & (
  | {
      isManuscript: true;
      manuscriptYearFrom: number;
      manuscriptYearTo: number;
      manuscriptClass: string;
      manuscriptSubclass: string | null;
    }
  | {
      isManuscript: false;
      year: string | null;
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
