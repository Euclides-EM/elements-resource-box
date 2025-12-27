interface UstcResult {
  ustc_id: number;
  authors: string[];
  short_title: string;
  publishers: string[];
  city: string | null;
  year: number | null;
  languages: string[];
  digitizations: string[];
  format: string | null;
}

function formatName(name: string): string {
  const cleanName = name.replace(/\s*\([^)]*\)\s*/g, '').trim();

  if (cleanName.includes(',')) {
    const parts = cleanName.split(',').map(p => p.trim());
    if (parts.length === 2) {
      return `${parts[1]} ${parts[0]}`;
    }
  }

  return cleanName;
}

export async function ustcLookup(ustc_id: number): Promise<UstcResult | null> {
  try {
    const url = `https://www.ustc.ac.uk/editions/${ustc_id}`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    const dataPageMatch = html.match(/data-page="([^"]+)"/);
    if (!dataPageMatch) {
      return null;
    }

    const decodedData = dataPageMatch[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#039;/g, "'");

    const pageData = JSON.parse(decodedData);
    const edition = pageData.props?.edition;

    if (!edition) {
      return null;
    }

    const authors: string[] = [];
    for (let i = 1; i <= 8; i++) {
      const authorName = edition[`author_name_${i}`];
      if (authorName && authorName.trim()) {
        const namesList = authorName.split(';').map((n: string) => n.trim()).filter((n: string) => n);
        for (const name of namesList) {
          authors.push(formatName(name));
        }
      }
    }

    const short_title = edition.std_title || "";

    const publishers: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const printerName = edition[`printer_name_${i}`];
      if (printerName && printerName.trim()) {
        const namesList = printerName.split(';').map((n: string) => n.trim()).filter((n: string) => n);
        for (const name of namesList) {
          publishers.push(formatName(name));
        }
      }
    }

    const city = edition.place || null;

    const year = edition.year ? parseInt(edition.year) : null;

    const languages: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const language = edition[`language_${i}`];
      if (language && language.trim()) {
        languages.push(language);
      }
    }

    const digitizations: string[] = [];
    if (
      pageData.props?.digitisations &&
      Array.isArray(pageData.props.digitisations)
    ) {
      for (const digitisation of pageData.props.digitisations) {
        if (digitisation.url) {
          digitizations.push(digitisation.url);
        }
      }
    }

    const format = edition.format || null;

    return {
      ustc_id,
      authors,
      short_title,
      publishers,
      city,
      year,
      languages,
      digitizations,
      format,
    };
  } catch (error) {
    console.error(`Error fetching USTC edition ${ustc_id}:`, error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ustc_id = parseInt(process.argv[2]);

  if (!ustc_id || isNaN(ustc_id)) {
    console.error("Please provide a valid USTC ID as an argument");
    process.exit(1);
  }

  ustcLookup(ustc_id).then((result) => {
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(`No data found for USTC ID ${ustc_id}`);
      process.exit(1);
    }
  });
}
