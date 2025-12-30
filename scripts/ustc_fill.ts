import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { ustcLookup } from "./ustc_lookup.ts";

const ITEMS_PRINT_PATH = path.join(
  process.cwd(),
  "public/docs/items_print.csv",
);
const SHELFMARKS_PATH = path.join(process.cwd(), "public/docs/shelfmarks.csv");

async function main() {
  const itemsCsv = fs.readFileSync(ITEMS_PRINT_PATH, "utf-8");
  const items = parse(itemsCsv, { columns: true });

  const shelfmarksCsv = fs.readFileSync(SHELFMARKS_PATH, "utf-8");
  const shelfmarks = parse(shelfmarksCsv, { columns: true });

  const shelfmarksByKey: { [key: string]: any[] } = {};
  for (const shelfmark of shelfmarks) {
    const key = shelfmark.key;
    if (!shelfmarksByKey[key]) {
      shelfmarksByKey[key] = [];
    }
    shelfmarksByKey[key].push(shelfmark);
  }

  console.log(`Processing ${items.length} items...`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const ustcId = item.ustc_id;

    if (!ustcId || ustcId === "" || ustcId === "-" || isNaN(parseInt(ustcId))) {
      continue;
    }

    console.log(`Processing row ${i + 1}: USTC ID ${ustcId}`);

    try {
      const ustcData = await ustcLookup(parseInt(ustcId));

      if (!ustcData) {
        console.log(`  No USTC data found for ID ${ustcId}`);
        continue;
      }

      if (!item.short_title && ustcData.short_title) {
        item.short_title = ustcData.short_title;
        item.short_title_source = "Specified in source";
      }

      if (ustcData.publishers && ustcData.publishers.length > 0) {
        item.publisher = ustcData.publishers.join(", ");
      }

      if (ustcData.format) {
        item.format = ustcData.format;
      }

      if (ustcData.digitizations && ustcData.digitizations.length > 0) {
        const key = item.key;
        if (!shelfmarksByKey[key] || shelfmarksByKey[key].length === 0) {
          const digitizationUrls = ustcData.digitizations.join("; ");
          if (item.notes) {
            item.notes = `${item.notes}; ${digitizationUrls}`;
          } else {
            item.notes = digitizationUrls;
          }
        }
      }

      console.log(`  Updated successfully`);
    } catch (error) {
      console.error(`  Error processing USTC ID ${ustcId}:`, error);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const csvOutput = stringify(items, { header: true });
  fs.writeFileSync(ITEMS_PRINT_PATH, csvOutput);

  console.log("Done! Updated items_print.csv");
}

main().catch(console.error);
