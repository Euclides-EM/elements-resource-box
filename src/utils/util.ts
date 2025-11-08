import { reduce } from "lodash";

export const groupByMap = <TFrom, TKey extends string, TValue = TFrom>(
  data: TFrom[],
  keyBy: (entry: TFrom) => TKey,
  valueBy: ((entry: TFrom) => TValue) | undefined = undefined,
): Record<TKey, TValue> => {
  return reduce(
    data,
    (acc, entry) => ({
      ...acc,
      [keyBy(entry)]: valueBy ? valueBy(entry) : entry,
    }),
    {} as Record<TKey, TValue>,
  );
};

export const joinArr = (arr: string[]): string => {
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
};
