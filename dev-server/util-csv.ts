import fs from "fs";
import Papa from "papaparse";
import path from "path";

export const loadCsvData = <T>(filePath: string): T[] => {
  const csvPath = path.resolve(`public/${filePath}`);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const parsed = Papa.parse<T>(csvContent, { header: true }).data;
  return parsed.filter(row => Object.values(row).some(value => value !== null && value !== undefined && value !== ""));
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

export const appendCsvRow = <T>(filePath: string, rowData: T): void => {
  const parsed = loadCsvData(filePath);
  parsed.push(rowData);
  saveCsvData(filePath, parsed);
};
