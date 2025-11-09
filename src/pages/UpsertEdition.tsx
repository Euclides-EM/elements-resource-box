import { useForm, useStore } from "@tanstack/react-form";
import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled from "@emotion/styled";
import { upsertEdition } from "../api/editionApi";
import { EditionRequestBody } from "../../common/api.ts";
import { AuthContext } from "../contexts/Auth.ts";
import { CATALOGUE_ROUTE } from "../components/layout/routes.ts";
import { startCase, uniq, uniqueId } from "lodash";
import {
  City,
  CSV_PATH_CITIES,
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
  ParatextTranslations,
  PrintDetails,
  PrintElementsMetadata,
  Review,
  Shelfmarks,
  StudyCorpuses,
} from "../../common/csv.ts";
import { loadAndParseCsv } from "../utils/csv.ts";
import { parseBooks } from "../utils/normalizeNames.ts";
import MultiSelect from "../components/tps/filters/MultiSelect.tsx";
import SingleSelect from "../components/tps/filters/SingleSelect.tsx";
import { Row } from "../components/common.ts";

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
  { name: "origin_eip_csv", label: "original EiP" },
];

const ANNOTATIONS = ["none", "a few", "some", "many", "uncatalogued"];

const PageContainer = styled.div`
  padding: 1rem 2rem;
  width: 100%;
  margin: 0 auto;
  min-height: calc(100vh - 120px);
  background-color: aliceblue;
`;

const FormContainer = styled.div`
  width: 100%;
  max-width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  overflow-x: hidden;
  color: black;

  em {
    font-size: 0.875rem;
    color: darkred;
  }
`;

const Title = styled.h1`
  margin: 0 0 2rem 0;
  font-size: 2rem;
  color: #333;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1rem;
`;

const FormField = styled.div<{ gap?: number; bgColor?: string }>`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.gap || 0.25}rem;
  background-color: ${(props) => props.bgColor || "unset"};
  padding: ${(props) => (props.bgColor ? 0.25 : 0)}rem;
  border-radius: 4px;

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

const RemoveButton = styled.button`
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: opacity 0.2s;
  background-color: #e74c3c;
  color: white;
  margin-top: 0.5rem;

  &:hover {
    opacity: 0.8;
  }
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
  background-color: #d1e8ff;
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

const loadExistingItem = async (key: string): Promise<EditionRequestBody> => {
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
        .map((s) => s.trim()) || [],
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
      })) satisfies EditionRequestBody["shelfmarks"],
    verified: reviews.some((r) => r.key === key),
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
          volumes: printItem!.volumes ? parseInt(printItem!.volumes, 10) : null,
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

const defaultValues = (): EditionRequestBody => ({
  key: getSuggestedKey(),
  shortTitle: "",
  shortTitleSource: "",
  cities: [],
  notes: "",
  corpus: [],
  shelfmarks: [],
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

export const UpsertEdition = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const key = searchParams.get("key");
  const { token } = useContext(AuthContext);
  const [images, setImages] = useState<Record<string, File>>({});
  const [values, setValues] = useState(defaultValues());
  const [itemLoading, setValuesLoading] = useState(false);
  const [listsLoading, setListsLoading] = useState(true);
  const [lists, setLists] = useState<{
    editors: string[];
    publishers: string[];
    additionalContents: string[];
    cities: string[];
  }>();
  const formContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm({
    defaultValues: values,
    onSubmit: async ({ value }) => {
      if (!token) {
        return;
      }
      try {
        await upsertEdition(value, images, token);
        navigate(CATALOGUE_ROUTE);
      } catch (err) {
        console.error(err);
        alert("Failed to submit form");
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
      // @ts-expect-error no key
      loadAndParseCsv<City>(CSV_PATH_CITIES),
    ])
      .then(([printItems, elementsMd, cities]) => {
        const editors = toOptions(printItems, "author_or_editor");
        const publishers = toOptions(printItems, "publisher");
        const additionalContents = toOptions(elementsMd, "additional_content");
        const cityNames = cities.map((c) => c.city).filter(Boolean);
        setLists({
          editors,
          publishers,
          additionalContents,
          cities: cityNames,
        });
      })
      .finally(() => setListsLoading(false));
  }, []);

  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
  const formIsValid = useStore(form.store, (state) => state.isValid);

  return (
    <PageContainer>
      {isSubmitting && (
        <LoadingOverlay>
          <LoadingSpinner />
          <LoadingText>
            {key ? "Updating record..." : "Adding record..."}
          </LoadingText>
        </LoadingOverlay>
      )}
      <FormContainer ref={formContainerRef}>
        <Title>{key ? "Update a record" : "Add a record"}</Title>
        {itemLoading || listsLoading ? (
          <div>Loading...</div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit().then(() => {
                if (formContainerRef.current) {
                  formContainerRef.current.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }
              });
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
                        name="shortTitleSource"
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

              <FormField />

              <FormField>
                <Label className="required">Item Type</Label>
                <form.Field name="isManuscript">
                  {(field) => (
                    <SingleSelect
                      name="isManuscript"
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
                          value > 2000 || value < 0
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
                          value > 2000 || value < 0
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
                            onChange={(values) => field.handleChange(values)}
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
                            onChange={(values) => field.handleChange(values)}
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
                            onChange={(values) => field.handleChange(values)}
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
                            onChange={(values) => field.handleChange(values)}
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
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(value) =>
                            field.handleChange(value as number | null)
                          }
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
                          value && isNaN(Number(value))
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
                            onBlur={field.handleBlur}
                          />
                          {!field.state.meta.isValid && (
                            <em>{field.state.meta.errors.join(",")}</em>
                          )}
                        </>
                      )}
                    </form.Field>
                  </FormField>

                  <FormField />

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
                      name="isElements"
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
                          value={field.state.value.map(String)}
                          onChange={(values) =>
                            field.handleChange(values.map(Number))
                          }
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
                          onChange={(values) => field.handleChange(values)}
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
                      options={STUDY_CORPUSES.map((c) => c.name)}
                      value={field.state.value}
                      onChange={(values) => field.handleChange(values)}
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
                            volume: null,
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
                          <form.Field name={`shelfmarks[${i}].scan`}>
                            {(f) => (
                              <Input
                                type="text"
                                value={f.state.value || ""}
                                onChange={(e) =>
                                  f.handleChange(e.target.value || null)
                                }
                                onBlur={f.handleBlur}
                                placeholder="Facsimile URL"
                              />
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
                                  <SelectedImage>
                                    {f.state.value && "Image is set"}
                                  </SelectedImage>
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

              <FormField>
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
              <SubmitButton
                type="submit"
                disabled={isSubmitting || !formIsValid}
              >
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
