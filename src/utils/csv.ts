import Papa from "papaparse";
import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();

export const loadAndParseCsv = async <
  T extends Record<string, string | boolean | null> = {
    key: string;
  } & Record<string, string | boolean | null>,
>(
  csvUrl: string,
): Promise<T[]> => {
  return queryClient.fetchQuery<T[]>({
    queryKey: ["csv", csvUrl],
    queryFn: async () => {
      const response = await fetch(csvUrl);
      const data = await response.text();
      return parseCsv<T>(data);
    },
  });
};

const parseCsv = <T>(csvText: string): T[] => {
  return Papa.parse<T>(csvText, {
    header: true,
    skipEmptyLines: true,
  }).data;
};

export const invalidateCsvCache = (): void => {
  queryClient.invalidateQueries({
    queryKey: ["csv"],
  });
};
