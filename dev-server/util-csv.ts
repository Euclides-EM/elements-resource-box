import fs from "fs";
import Papa from "papaparse";
import path from "path";

export const loadCsvData = <T extends Record<string, unknown>>(
  filePath: string,
): T[] => {
  filePath = `public/${filePath}`;
  const csvPath = path.resolve(filePath);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const parsed = Papa.parse<T>(csvContent, { header: true }).data;
  return parsed.filter((row) =>
    Object.values(row).some(
      (value) => value !== null && value !== undefined && value !== "",
    ),
  );
};

export const saveCsvData = <T>(filePath: string, data: T[]): void => {
  const csvPath = path.resolve(`public/${filePath}`);
  const updatedCsv = Papa.unparse(data);
  fs.writeFileSync(csvPath, updatedCsv);
};

export const upsertCsvRow = <T extends Record<string, string | null>>(
  filePath: string,
  key: string,
  rowData: T,
  keyField: string = "key",
): void => {
  const parsed = loadCsvData<T>(filePath);
  const existingIndex = parsed.findIndex((row) => row[keyField] === key);

  if (existingIndex !== -1) {
    Object.keys(rowData).forEach((field) => {
      if (rowData[field] !== undefined && rowData[field] !== null) {
        // @ts-expect-error ...
        parsed[existingIndex][field] = rowData[field];
      }
    });
  } else {
    const newRow = { [keyField]: key, ...rowData };
    parsed.push(newRow);
  }

  saveCsvData(filePath, parsed);
};

export const batchUpsertCsvRows = <T extends Record<string, string | null>>(
  filePath: string,
  rowsData: T[],
  keyField: string = "key",
): void => {
  if (rowsData.length === 0) return;

  const parsed = loadCsvData<T>(filePath);
  const rowsByKey = new Map<string, T>();

  const isTranslationsFile = filePath.includes("translations");

  for (const row of rowsData) {
    const mapKey =
      isTranslationsFile && row.field
        ? `${row[keyField]}:${row.field}`
        : String(row[keyField]);
    rowsByKey.set(mapKey, row);
  }

  const updatedData: T[] = [];

  for (const existingRow of parsed) {
    const mapKey =
      isTranslationsFile && existingRow.field
        ? `${existingRow[keyField]}:${existingRow.field}`
        : String(existingRow[keyField]);
    const newRow = rowsByKey.get(mapKey);
    if (newRow) {
      const hasChanges = Object.keys(newRow).some(
        (field) =>
          !["source"].includes(field) && existingRow[field] !== newRow[field],
      );
      if (hasChanges) {
        updatedData.push(newRow);
      } else {
        updatedData.push(existingRow);
      }
      rowsByKey.delete(mapKey);
    } else {
      updatedData.push(existingRow);
    }
  }

  for (const newRow of rowsByKey.values()) {
    updatedData.push(newRow);
  }

  saveCsvData(filePath, updatedData);
};

export const deleteCsvRow = <T extends Record<string, string | null>>(
  filePath: string,
  key: string,
  keyField: string = "key",
): void => {
  const parsed = loadCsvData<T>(filePath);
  const filteredData = parsed.filter((row) => row[keyField] !== key);
  if (filteredData.length !== parsed.length) {
    saveCsvData(filePath, filteredData);
  }
};
