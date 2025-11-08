export type BookStatementRef = {
  page?: number;
  elementsBook?: number;
  statementType?:
    | "Proposition"
    | "Definition"
    | "Postulate"
    | "CommonNotion"
    | null;
  statementNumber?: number | null;
  note?: string | null;
  many?: boolean;
};

export function toDisplay(code: BookStatementRef): string {
  const resultParts: string[] = [];
  if (code.elementsBook) {
    let elementsRef = toRoman(code.elementsBook);
    if (code.statementType && code.statementNumber) {
      elementsRef = `${elementsRef}.${
        {
          Proposition: "Prop",
          Definition: "Def",
          Postulate: "Post",
          CommonNotion: "CN",
        }[code.statementType]
      }.${code.statementNumber}`;
    }
    resultParts.push(elementsRef);
  }
  if (code.page) {
    resultParts.push(`p.${code.page}`);
  }
  if (code.many) {
    resultParts.push("Many");
  }
  if (code.note) {
    resultParts.push(`(${code.note})`);
  }

  return resultParts.filter(Boolean).join(" ");
}

function toRoman(num: number): string {
  const map: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let result = "";
  for (const [value, numeral] of map) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}

function fromRoman(roman: string): number {
  const map: Record<string, number> = {
    M: 1000,
    CM: 900,
    D: 500,
    CD: 400,
    C: 100,
    XC: 90,
    L: 50,
    XL: 40,
    X: 10,
    IX: 9,
    V: 5,
    IV: 4,
    I: 1,
  };
  let i = 0,
    n = 0;
  const s = roman.toUpperCase();
  while (i < s.length) {
    const two = s.slice(i, i + 2);
    if (map[two]) {
      n += map[two];
      i += 2;
      continue;
    }
    const one = s[i];
    if (!map[one]) break;
    n += map[one];
    i += 1;
  }
  return n;
}

export function parseBookStatementRef(input: string): BookStatementRef {
  const raw = input.trim();
  const lower = raw.toLowerCase();

  const res: BookStatementRef = {};

  // Page: try p.m. (multiple pages)
  res.many = !!lower.match(/p\.m\./);

  // Page: try p.<digits>
  const pNum = lower.match(/p\.\s*([\d+])/);
  if (pNum) {
    res.page = parseInt(pNum[1], 10);
  }

  // Book: try leading Roman numerals like "III."
  const romanBNum = lower.match(/^([ivxlcdm]+)\b/i);
  if (romanBNum) {
    res.elementsBook = fromRoman(romanBNum[1]);
  }

  // Book: try b<digits>
  const bNum = lower.match(/b(\d+)/);
  if (bNum) {
    res.elementsBook = parseInt(bNum[1], 10);
  }

  // Type: accept p, d, po, cn, and dotted words prop, def, post, cn, but only if followed by a (book) number
  const typeMap: Record<string, BookStatementRef["statementType"]> = {
    p: "Proposition",
    prop: "Proposition",
    d: "Definition",
    def: "Definition",
    po: "Postulate",
    post: "Postulate",
    cn: "CommonNotion",
  };

  // Try compact form like b6p6 or b1cn2
  let m = lower.match(/b\d+(cn|po|p|d)(\d+)/);
  if (!m) {
    // Try dotted word form like "III.Def.4" or "I.Prop.47"
    m = lower.match(/[ivxlcdm]+\.(prop|def|post|cn)\.(\d+)/);
  }
  if (m) {
    res.statementType = typeMap[m[1]];
    if (m[2] !== undefined) {
      res.statementNumber = parseInt(m[2], 10);
    }
  }

  // Note: anything in trailing parentheses
  const noteMatch = raw.match(/\(([^)]*)\)\s*$/);
  if (noteMatch) {
    res.note = noteMatch[1].trim() || null;
  }

  return res;
}

export function compare(a: BookStatementRef, b: BookStatementRef): number {
  if (a.elementsBook == null && b.elementsBook == null) {
    return a.page ?? 0 - (b.page ?? 0);
  }
  if (a.elementsBook == null) return 1;
  if (b.elementsBook == null) return -1;

  // 1) book
  if (a.elementsBook !== b.elementsBook) return a.elementsBook - b.elementsBook;

  // 2) type (entries with no type come first)
  const aHasType = a.statementType != null;
  const bHasType = b.statementType != null;
  if (aHasType !== bHasType) return aHasType ? 1 : -1;
  if (aHasType && bHasType) {
    const typeOrder: Record<
      NonNullable<BookStatementRef["statementType"]>,
      number
    > = {
      Definition: 0,
      Postulate: 1,
      CommonNotion: 2,
      Proposition: 3,
    };

    const ta = typeOrder[a.statementType!];
    const tb = typeOrder[b.statementType!];
    if (ta !== tb) return ta - tb;
  }

  // 3) number (entries with no number come first)
  const aHasNum = a.statementNumber != null;
  const bHasNum = b.statementNumber != null;
  if (aHasNum !== bHasNum) return aHasNum ? 1 : -1;
  if (aHasNum && bHasNum && a.statementNumber! !== b.statementNumber!)
    return a.statementNumber! - b.statementNumber!;

  // 4) note (lexicographic, empty last)
  const an = a.note?.trim() ?? "";
  const bn = b.note?.trim() ?? "";
  if (an === bn) return 0;
  if (!an) return 1;
  if (!bn) return -1;
  return an.localeCompare(bn, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export const compareBookStatementRef = (a: unknown, b: unknown): number => {
  return compare(
    parseBookStatementRef(a as string),
    parseBookStatementRef(b as string),
  );
};
