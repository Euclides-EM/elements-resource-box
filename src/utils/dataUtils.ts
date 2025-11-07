import {
  City,
  DottedLine,
  EditionCopy,
  Feature,
  FLOATING_CITY,
  FLOATING_CITY_ENTRY,
  Item,
  Range,
} from "../types";
import { isEmpty, startCase, uniq } from "lodash";
import Papa from "papaparse";
import { Dispatch, SetStateAction } from "react";
import {
  CSV_PATH_CITIES,
  CSV_PATH_COPIES,
  CSV_PATH_DOTTED_LINES,
  CSV_PATH_ELEMENTS,
  CSV_PATH_SECONDARY,
  FeaturesToSplit,
  FeatureToColumnName,
  ItemTypes,
} from "../constants";
import { Point } from "react-simple-maps";
import {
  BookStatementRef,
  parseBookStatementRef,
  toDisplay,
} from "../types/book_statement_ref.ts";
import { groupByMap } from "./util.ts";
import { fetchDiagramDirectories } from "./diagrams.ts";

const parseBooks = (
  booksRaw: string | null,
): {
  elementsBooks: Range[];
  elementsBooksExpanded: number[];
  additionalContent: string[];
} => {
  if (!booksRaw) {
    return {
      elementsBooks: [],
      elementsBooksExpanded: [],
      additionalContent: [],
    };
  }

  const elementsBooks: Range[] = [];
  const elementsBooksExpanded: number[] = [];
  const additionalContent: string[] = [];

  const entries = booksRaw
    .split(";")
    .map((e) => e.replaceAll(/\([^)]*\)/g, "").trim())
    .filter((e) => e);

  for (const entry of entries) {
    const match = entry.match(/^"?Elements\s+(.+?)"?$/i);
    if (!match) {
      additionalContent.push(startCase(entry.toLowerCase()));
      continue;
    }

    const parts = match[1]
      .split(",")
      .map((p) => p.trim().replace(/[–-]/g, "-")); // normalize dash

    for (const part of parts) {
      if (part === "?") {
        continue;
      }
      const rangeMatch = part.match(/^(\d+)-(\d+)$/);
      const singleMatch = part.match(/^(\d+)$/);

      if (rangeMatch) {
        elementsBooks.push({
          start: parseInt(rangeMatch[1], 10),
          end: parseInt(rangeMatch[2], 10),
        });
        for (
          let i = parseInt(rangeMatch[1], 10);
          i <= parseInt(rangeMatch[2], 10);
          i++
        ) {
          elementsBooksExpanded.push(i);
        }
      } else if (singleMatch) {
        const num = parseInt(singleMatch[1], 10);
        elementsBooks.push({ start: num, end: num });
        elementsBooksExpanded.push(num);
      } else {
        console.error(`Unrecognized book format: ${part}`);
      }
    }
  }

  return { elementsBooks, elementsBooksExpanded, additionalContent };
};

const ifEmpty = <T>(arr: T[], defaultValue: T[]): T[] =>
  arr.length === 0 ? defaultValue : arr;

const toYesNo = (value: string): "Yes" | "No" => {
  return value === "True" ? "Yes" : "No";
};

function parseExplicitLanguages(langs: string) {
  return langs
    .split(/, | et | en | & /)
    .map((input) => {
      const normalized = input
        .replaceAll("-", "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const rules = [
        {
          match:
            /latin|latina|latino|latine|latein|latijn|latinum|latinit|la tine|latijnsche/,
          lang: "Latin",
        },
        { match: /greek|graec|græc|grec|griech/, lang: "Greek" },
        { match: /fran[çc]ois|francois|french/, lang: "French" },
        { match: /italien|italian|italiana|thoscana|toscana/, lang: "Italian" },
        {
          match: /spanish|espanol|española|traduzidas|castellano|hispanice/,
          lang: "Spanish",
        },
        { match: /german|teutsch|teutscher|deutsch/, lang: "German" },
        {
          match: /nederduyts|nederduytse|neerduid|neerduyts|neerdvyt|niderland/,
          lang: "Dutch",
        },
        { match: /arabic/, lang: "Arabic" },
        { match: /english|englishe/, lang: "English" },
        {
          match: /romance|vulgar|volgar|vvlgare|vernacul|en nostre langve/,
          lang: "general-vernacular",
        },
      ];

      for (const { match, lang } of rules) {
        if (match.test(normalized)) return lang;
      }

      return normalized ? "Other" : "";
    })
    .filter(Boolean)
    .map((lang) => startCase(lang.toLowerCase()));
}

function parseInstitutions(institutions: string) {
  return institutions
    .split(/, | et | en | & /)
    .map((input) => {
      const normalized = input
        .replaceAll("-", "")
        .replaceAll("\n", "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const rules = [
        {
          match:
            /\b(?:(?:la\s*)?(?:compagnie|compañ[ií]a|compania))\s+de\s+(?:jesus|iesvs|jesvs)|\b(?:soc\.?|soci[eé]t\.?|societate|societ\.)\s*(?:jesu|iesv|jesv)|\b(?:societatis)(?:\s+(?:jesu|iesv))?(?:\s+gymnasio)?\b|\bsociety of jesus\b|\bjesuite\b|\bpanormitano.*sicili\b|\bherbipolitano.*franconi\b|\bgymnasio.*(?:jesu|iesv|jesv)\b/i,
          label: "Jesuits",
        },
      ];

      for (const { match, label } of rules) {
        if (match.test(normalized)) return label;
      }

      return normalized ? "Other" : "";
    })
    .filter(Boolean)
    .map((lang) => startCase(lang.toLowerCase()));
}

function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeAncientPersona(name: string): string | null {
  const contains = (...opts: string[]) => opts.some((n) => name.includes(n));

  if (
    contains(
      "archimedes",
      "archimede",
      "archimedis",
      "archimede.",
      "archimede",
      "d'archimedes",
      "archimedes",
      "archimed",
      "archimede",
      "archimede",
      "archimedes",
    ) ||
    contains("archimede", "d’archimedes", "d'archimedes", "archimede") ||
    /ἀρχιμήδη|αρχιμηδη|archimede/.test(name)
  )
    return "Archimedes";

  if (contains("avtolyci", "autolyc", "autolycus"))
    return "Autolycus of Pitane";

  if (contains("alexander aphrodiseus", "alexander aphrodis", "aphrodisias"))
    return "Alexander of Aphrodisias";

  if (contains("apollonij", "apollonius", "apollonio"))
    return "Apollonius of Perga";

  if (contains("aristarchi sami", "aristarchus", "aristarco"))
    return "Aristarchus of Samos";

  if (
    contains(
      "aristote",
      "aristotele",
      "aristoteleam",
      "aristoteles",
      "aristotelis",
      "d’aristote",
      "d'aristote",
      "πλατωνος",
    ) ||
    /ἀριστοτε/.test(name)
  )
    return "Aristotle";

  if (contains("athenagorae philosophi", "athenagoras"))
    return "Athenagoras of Athens";

  if (contains("barlaam")) return "Barlaam of Seminara";

  if (
    contains(
      "zamberti",
      "zamberto",
      "bartholomaei zamberti",
      "bartholomæi zamberti",
      "bartholamæi zamberti",
    )
  )
    return "Bartholomeo Zamberti";

  if (
    contains("batholomaeo veneto", "batholomæo veneto", "à bartholomæo veneto")
  )
    return "Bartolomeo Veneto";

  if (contains("boetii", "boetij", "boethius", "boetius")) return "Boethius";

  if (contains("boneti latensis", "boni latensis")) return "Bonetus Latensis";

  if (
    contains(
      "campane",
      "campani",
      "campani galli transalpini",
      "campani galli",
      "campani ",
      "campano",
      "due Tradottioni",
    )
  )
    return "Campanus of Novara";

  if (contains("candallae", "fr. flussatis candallae", "flussas"))
    return "François de Foix de Candalle";

  if (
    contains(
      "christophoro clavio",
      "r.p. christophori clauij",
      "clavius",
      "clauij",
    )
  )
    return "Christopher Clavius";

  if (contains("cleomedes", "cleonidis")) return "Cleomedes";

  if (
    contains(
      "commandine",
      "federici commandini",
      "federici commandini",
      "federici commandini",
      "fededici commandini",
      "commandini",
    )
  )
    return "Federico Commandino";

  if (contains("copernican")) return "Nicolaus Copernicus";

  if (contains("galileo", "del galileo", "galilei")) return "Galileo Galilei";

  if (contains("torricelli")) return "Evangelista Torricelli";

  if (contains("eutocij", "eutocius")) return "Eutocius of Ascalon";

  if (
    contains(
      "françois viete",
      "mr. viete",
      "de l'illustre f. viete",
      "viete",
      "viète",
    )
  )
    return "François Viète";

  if (contains("fabrice mordente", "mordente")) return "Fabrizio Mordente";

  if (contains("galenus")) return "Galen";

  if (contains("gilberti porretae", "porretae")) return "Gilbert de la Porrée";

  if (
    contains(
      "henrichvs loritvs glareanvs",
      "henricvs loritvs glareanvs",
      "glareanus",
    )
  )
    return "Henricus Glareanus";

  if (
    contains(
      "heronis alexandrini",
      "heronis alexandrini",
      "heronis alexandrini".replace("i", "i"),
    ) ||
    contains("heronis alexandrini", "heronis alexandrini")
  )
    // resilience
    return "Hero of Alexandria";
  if (contains("ηρωνος αλεξανδρεως", "ηρωνος", "αλεξανδρεως"))
    return "Hero of Alexandria";

  if (
    contains("hypsiclis alexandrini", "hypsiclis", "hypsiclem", "hypsi. alex.")
  )
    return "Hypsicles of Alexandria";

  if (contains("iacobi peletarii cenom.", "peletarii", "peletier"))
    return "Jacques Peletier";

  if (contains("isaaci monachi")) return "Isaac Argyros";

  if (contains("isidorvm", "isidore")) return "Isidore of Seville";

  if (contains("ioannis murmelij", "murmelij", "murmelius"))
    return "Johannes Murmellius";

  if (contains("john dee", "m. i. dee", "i. dee", "dee of london"))
    return "John Dee";

  if (contains("marinus", "marini dialectici")) return "Marinus of Neapolis";

  if (contains("martianvs rota")) return "Martianus Rota";

  if (contains("maurolyci", "mavrolyci", "maurolico"))
    return "Francesco Maurolico";

  if (contains("menelai", "menelaus")) return "Menelaus of Alexandria";

  if (contains("nicephori", "nicephorus")) return "Nicephorus";

  if (contains("procli", "proclus", "πρόκλου")) return "Proclus";

  if (contains("pappi mechanici", "pappi", "pappus"))
    return "Pappus of Alexandria";

  if (
    contains(
      "platone",
      "platus",
      "πλάτων",
      "πλατων",
      "πλάτωνος",
      "plato",
      "γλάπτων",
    )
  )
    return "Plato";

  if (contains("pythagorean", "pytagorean", "πυθαγόρας", "γυπαγόρας"))
    return "Pythagoras";

  if (contains("robert hves", "robert hues")) return "Robert Hues";

  // Rhazes
  if (contains("rhazes")) return "Abu Bakr al-Razi";

  if (contains("rodolphi agricolae")) return "Rodolphus Agricola";

  if (contains("stevin")) return "Simon Stevin";

  if (contains("sacrobosco")) return "Johannes de Sacrobosco";

  if (contains("scipio vegius")) return "Scipione Vizzani";

  if (contains("theodosii", "theodosij")) return "Theodosius of Bithynia";

  if (
    contains(
      "theonis alexandrini",
      "theonis",
      "theon",
      "θεωνος",
      "θεῶνος",
      "θέωνος",
    )
  )
    return "Theon of Alexandria";

  if (contains("timeus", "timaeus")) return "Timaeus of Locri";

  if (contains("zamber", "due Tradottioni")) return "Bartholomeo Zamberti";

  return null;
}

function parseOtherNames(otherNames: string): string[] {
  return otherNames
    .split(",")
    .map((s) =>
      stripDiacritics(s)
        .replaceAll("\n", "")
        .replace(/\s*-\s*/, "")
        .replace(/[()]/g, "")
        .replace(/\u017F/g, "s") // long s → s (e.g., Monſieur)
        .replace(/[''`´]/g, "'") // unify apostrophes
        .toLowerCase()
        .trim(),
    )
    .filter(Boolean)
    .map(normalizeAncientPersona)
    .filter((name): name is string => name !== null);
}

function mapOtherName(s: string): string {
  switch (s) {
    case "contemporary":
      return "Contemporary scholars";
    case "ancient":
      return "Other ancient scholars by name";
    case "ancient general":
      return "Ancient scholars as a group";
  }
  return startCase(s.toLowerCase());
}

function mapStudyCorpus(s: string): string {
  switch (s) {
    case "dh":
      return "DH core texts";
  }
  return startCase(s.toLowerCase());
}

function parseStudyCorpora(
  raw: Record<string, unknown>,
  type: "elements" | "secondary",
): string[] {
  const studyCorpora: string[] =
    (raw["included_in_studies"] as string | null)
      ?.split(", ")
      .map((study: string): string => mapStudyCorpus(study))
      .filter(Boolean) || [];
  if (
    (!Number(raw["year"]) || Number(raw["year"]) <= 1700) &&
    type === "elements" &&
    raw["language"] !== "CHINESE" &&
    raw["title"] &&
    raw["title"] !== "?"
  ) {
    studyCorpora.push("Title pages");
  }
  return studyCorpora;
}

export const loadEditionsData = (
  setItems: Dispatch<SetStateAction<Item[]>>,
  setFloatingCity = false,
) => {
  Promise.all([
    fetch(CSV_PATH_ELEMENTS).then((response) => response.text()),
    fetch(CSV_PATH_SECONDARY).then((response) => response.text()),
    fetchDiagramDirectories(),
    loadDottedLinesAsync(),
    loadCopiesAsync(),
  ])
    .then(
      ([
        elementsText,
        secondaryText,
        diagramDirectories,
        dottedLinesMap,
        copiesMap,
      ]) => {
        const processData = (csvText: string, type: keyof typeof ItemTypes) => {
          return new Promise<Item[]>((resolve) => {
            Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true,
              complete: (result) => {
                const items = (result.data as Record<string, unknown>[])
                  .map((raw) => {
                    const hasTitle =
                      Boolean(raw["title"]) && raw["title"] !== "?";
                    const hasTitleImage = Boolean(raw["tp_url"]) && hasTitle;
                    return {
                      key: raw["key"] as string,
                      year: raw["year"] as string,
                      cities: ifEmpty(
                        [raw["city"] as string, raw["city 2"] as string].filter(
                          Boolean,
                        ) as string[],
                        setFloatingCity ? [FLOATING_CITY] : [],
                      ),
                      languages: [
                        startCase((raw["language"] as string).toLowerCase()),
                        startCase((raw["language 2"] as string).toLowerCase()),
                      ].filter(Boolean) as string[],
                      authors:
                        (raw["author (normalized)"] as string | null)?.split(
                          ", ",
                        ) || [],
                      imageUrl: (raw["tp_url"] ||
                        raw["tp_url_alt"] ||
                        raw["frontispiece_url"]) as string | null,
                      title: raw["title"] as string,
                      titleEn: raw["title_EN"] as string | null,
                      imprint: raw["imprint"] as string | null,
                      imprintEn: raw["imprint_EN"] as string | null,
                      scanUrl: (() => {
                        const originalUrls = raw["scan_url"]
                          ? (raw["scan_url"] as string)
                              .split(";")
                              .filter(Boolean)
                          : [];
                        const copiesUrls =
                          copiesMap[raw["key"] as string] || [];
                        const allUrls = [...originalUrls, ...copiesUrls];
                        return allUrls.length > 0 ? allUrls : null;
                      })(),
                      type: ItemTypes[type],
                      format: raw["format"] as string | null,
                      ...parseBooks(raw["books"] as string | null),
                      volumesCount: raw["volumesCount"]
                        ? parseInt(raw["volumesCount"] as string)
                        : null,
                      class: raw["wClass"] as string | null,
                      hasTitle:
                        Boolean(raw["tp_url"]) &&
                        Boolean(raw["title"]) &&
                        raw["title"] !== "?"
                          ? "Yes, based on digital facsimile"
                          : Boolean(raw["title"]) && raw["title"] !== "?"
                            ? "Yes, based on catalog long title"
                            : raw["title"] !== "?"
                              ? "No"
                              : "Unknown",

                      study_corpora: parseStudyCorpora(raw, type),
                      tp_illustration: raw["tp_illustration"]
                        ? "Yes"
                        : "No or uncatalogued",
                      colorInTitle: hasTitleImage
                        ? raw["has_red"] === "True"
                          ? "Black and Red"
                          : "Black"
                        : null,
                      titlePageDesign: hasTitleImage
                        ? startCase(
                            (raw["tp_design"] as string | null)?.toLowerCase(),
                          )
                        : null,
                      titlePageNumberOfTypes: hasTitleImage
                        ? raw["num_of_types"]
                          ? parseInt(raw["num_of_types"] as string)
                          : null
                        : null,
                      titlePageFrameType: hasTitleImage
                        ? startCase(
                            (raw["frame_type"] as string | null)?.toLowerCase(),
                          )
                        : null,
                      titlePageEngraving: hasTitleImage
                        ? startCase(
                            (raw["engraving"] as string | null)?.toLowerCase(),
                          )
                        : null,
                      hasPrintersDevice: hasTitleImage
                        ? toYesNo(raw["printer_device"] as string)
                        : null,
                      fontTypes: hasTitleImage
                        ? (raw["font_types"] as string | null)
                            ?.split(", ")
                            .map((type) => startCase(type.toLowerCase()))
                            .filter(Boolean) || []
                        : [],
                      calligraphicFeatures: hasTitleImage
                        ? startCase(
                            (
                              raw["calligraphic_features"] as string | null
                            )?.toLowerCase(),
                          )
                        : null,
                      notes: raw["notes"] as string | null,
                      otherNamesClassification: hasTitle
                        ? ((raw["other_names_classification"] as string | null)
                            ?.split(", ")
                            .map((s) => mapOtherName(s))
                            .concat(raw["EUCLID REF"] ? ["Euclid"] : [])
                            .filter(Boolean) ?? [])
                        : null,
                      hasIntendedAudience: hasTitle
                        ? raw["EXPLICIT RECIPIENT"] ||
                          raw["EXPLICIT RECIPIENT 2"]
                          ? ("Yes" as const)
                          : ("No" as const)
                        : null,
                      hasPatronageDedication: hasTitle
                        ? raw["PATRON REF"] || raw["IMPRINT DEDICATION"]
                          ? ("Yes" as const)
                          : ("No" as const)
                        : null,
                      hasAdapterAttribution: hasTitle
                        ? raw["AUTHOR NAME"] || raw["AUTHOR NAME 2"]
                          ? ("Yes" as const)
                          : ("No" as const)
                        : null,
                      hasPublishingPrivileges: hasTitle
                        ? raw["PRIVILEGES"] || raw["IMPRINT PRIVILEGES"]
                          ? ("Yes" as const)
                          : ("No" as const)
                        : null,
                      hasGreekDesignation: hasTitle
                        ? raw["GREEK IN NON GREEK BOOKS"]
                          ? ("Yes" as const)
                          : ("No" as const)
                        : null,
                      explicitLanguageReferences: hasTitle
                        ? parseExplicitLanguages(
                            `${raw["EXPLICITLY STATED: TRANSLATED FROM"] || ""}, ${raw["EXPLICITLY STATED: TRANSLATED TO"] || ""}`,
                          )
                        : null,
                      institutions: hasTitle
                        ? parseInstitutions(
                            (raw["INSTITUTIONS"] as string | null) || "",
                          )
                        : null,
                      otherNames: hasTitle
                        ? parseOtherNames(
                            (raw["OTHER NAMES"] as string | null) || "",
                          )
                        : null,
                      features: Object.keys(FeatureToColumnName).reduce(
                        (acc, feature) => {
                          acc[feature as Feature] = FeatureToColumnName[
                            feature as Feature
                          ]
                            .filter((column) => !!raw[column])
                            .map((column) => raw[column] as string)
                            .flatMap((text) =>
                              FeaturesToSplit[feature as Feature]
                                ? uniq(text.split(", "))
                                : text.split("::"),
                            )
                            .map((t) => t.trim());
                          if (feature === "Elements Designation") {
                            acc[feature as Feature] =
                              !raw["Elements_designation"] &&
                              type === "elements"
                                ? [raw["base_content"] as string]
                                : raw["Elements_designation"] === "none" &&
                                    type === "elements"
                                  ? []
                                  : acc[feature as Feature];
                          }
                          return acc;
                        },
                        {} as Partial<Record<Feature, string[]>>,
                      ),
                      diagrams_extracted: startCase(
                        diagramDirectories.has(raw["key"] as string).toString(),
                      ),
                      has_diagrams:
                        startCase(
                          dottedLinesMap[
                            raw["key"] as string
                          ]?.hasDiagrams.toString(),
                        ) || "Uncatalogued",
                      dotted_lines_cases: dottedLinesMap[
                        raw["key"] as string
                      ]?.all.map(toDisplay) || ["Uncatalogued"],
                      dotted_lines_b79_cases: startCase(
                        dottedLinesMap[
                          raw["key"] as string
                        ]?.hasBook7To9Token.toString(),
                      ),
                      dotted_lines_b10_case: startCase(
                        dottedLinesMap[
                          raw["key"] as string
                        ]?.hasBook10Dotted.toString(),
                      ),
                      dotted_lines_b2_cases:
                        dottedLinesMap[raw["key"] as string]?.book2Cases.map(
                          toDisplay,
                        ) || [],
                      dotted_lines_geo_cases:
                        dottedLinesMap[raw["key"] as string]?.geoCases.map(
                          toDisplay,
                        ) || [],
                      dotted_lines_other_cases:
                        dottedLinesMap[raw["key"] as string]?.otherCases.map(
                          toDisplay,
                        ) || [],
                    };
                  })
                  .filter((item) => !!item.key);
                resolve(items);
              },
            });
          });
        };

        return Promise.all([
          processData(elementsText, "elements"),
          processData(secondaryText, "secondary"),
        ]);
      },
    )
    .then(([elementsItems, secondaryItems]) => {
      const allItems = [...elementsItems, ...secondaryItems];
      setItems(
        allItems.sort(
          (a, b) => a.year.localeCompare(b.year) || a.key.localeCompare(b.key),
        ),
      );
    })
    .catch((error) => console.error("Error reading CSV:", error));
};

export const loadCitiesAsync = async (): Promise<Record<string, Point>> => {
  const response = await fetch(CSV_PATH_CITIES);
  const data = await response.text();
  const cities = Papa.parse<City>(data.trim(), { header: true }).data;
  cities.push(FLOATING_CITY_ENTRY);
  return groupByMap(
    cities,
    (city) => city.city,
    (city) => [city.lon, city.lat],
  );
};

const loadCopiesAsync = async (): Promise<Record<string, string[]>> => {
  const response = await fetch(CSV_PATH_COPIES);
  const data = await response.text();
  const copies = Papa.parse<EditionCopy>(data.trim(), { header: true }).data;

  const copiesMap: Record<string, string[]> = {};

  copies.forEach((copy) => {
    if (copy.key && copy.scan_url) {
      if (!copiesMap[copy.key]) {
        copiesMap[copy.key] = [];
      }
      copiesMap[copy.key].push(copy.scan_url);
    }
  });

  return copiesMap;
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
  const response = await fetch(CSV_PATH_DOTTED_LINES);
  const data = await response.text();
  const dottedLines = Papa.parse<DottedLine>(data.trim(), {
    header: true,
  }).data;

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
