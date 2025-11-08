import { startCase } from "lodash";
import { Range } from "../types";

export const parseBooks = (
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

export function parseExplicitLanguages(langs: string) {
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

export function parseInstitutions(institutions: string) {
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

export function parseOtherNames(otherNames: string): string[] {
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

export function mapOtherName(s: string): string {
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
