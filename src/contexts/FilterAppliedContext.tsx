import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { Item, MAX_YEAR, MIN_YEAR } from "../types";
import { FilterValue } from "../components/map/Filter";
import { loadCitiesAsync, loadEditionsData } from "../utils/dataUtils";
import { Point } from "react-simple-maps";
import { NO_FILTER_ROUTES } from "../components/layout/routes";
import { buildAppUrl, getAppPathname } from "../utils/basePath";
import {
  createLoader,
  createSerializer,
  parseAsBoolean,
  parseAsJson,
  parseAsString,
} from "nuqs";

const QUERY_PARAMS = {
  FILTERS: "filters",
  FILTERS_INCLUDE: "filtersInclude",
  RANGE: "range",
  INCLUDE_UNDATED: "includeUndated",
  TEXT_SEARCH: "textSearch",
  TEXT_SEARCH_FIELDS: "textSearchFields",
} as const;

export type FilterState = {
  filters: Record<string, FilterValue[] | undefined>;
  filtersInclude: Record<string, boolean>;
  range: [number, number];
  includeUndated: boolean;
  textSearch: string;
  textSearchFields: (keyof Item)[];
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFilterValue = (value: unknown): value is FilterValue =>
  isObjectRecord(value) &&
  typeof value.label === "string" &&
  typeof value.value === "string";

const isFiltersState = (
  value: unknown,
): value is Record<string, FilterValue[] | undefined> => {
  if (!isObjectRecord(value)) {
    return false;
  }
  return Object.values(value).every(
    (entry) =>
      entry === undefined ||
      (Array.isArray(entry) && entry.every((item) => isFilterValue(item))),
  );
};

const isFiltersIncludeState = (
  value: unknown,
): value is Record<string, boolean> => {
  if (!isObjectRecord(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === "boolean");
};

const isRangeState = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((entry) => typeof entry === "number" && Number.isFinite(entry));

const isTextSearchFieldsState = (value: unknown): value is (keyof Item)[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const filterQueryParsers = {
  [QUERY_PARAMS.FILTERS]: parseAsJson<
    Record<string, FilterValue[] | undefined>
  >((value) => (isFiltersState(value) ? value : null)),
  [QUERY_PARAMS.FILTERS_INCLUDE]: parseAsJson<Record<string, boolean>>(
    (value) => (isFiltersIncludeState(value) ? value : null),
  ),
  [QUERY_PARAMS.RANGE]: parseAsJson<[number, number]>((value) =>
    isRangeState(value) ? value : null,
  ),
  [QUERY_PARAMS.INCLUDE_UNDATED]: parseAsBoolean,
  [QUERY_PARAMS.TEXT_SEARCH]: parseAsString,
  [QUERY_PARAMS.TEXT_SEARCH_FIELDS]: parseAsJson<(keyof Item)[]>((value) =>
    isTextSearchFieldsState(value) ? value : null,
  ),
};

const loadFilterQueryState = createLoader(filterQueryParsers);
const serializeFilterQueryState = createSerializer(filterQueryParsers, {
  clearOnDefault: true,
});

const parseQueryParams = (): Partial<FilterState> | null => {
  const params = loadFilterQueryState(window.location.search);
  const queryState: Partial<FilterState> = {};

  if (params.filters !== null) {
    queryState.filters = params.filters;
  }

  if (params.filtersInclude !== null) {
    queryState.filtersInclude = params.filtersInclude;
  }

  if (params.range !== null) {
    queryState.range = params.range;
  }

  if (params.includeUndated !== null) {
    queryState.includeUndated = params.includeUndated;
  }

  if (params.textSearch !== null) {
    queryState.textSearch = params.textSearch;
  }

  if (params.textSearchFields !== null) {
    queryState.textSearchFields = params.textSearchFields;
  }

  return Object.keys(queryState).length > 0 ? queryState : null;
};

const updateQueryParams = (state: FilterState, defaultState: FilterState) => {
  if (NO_FILTER_ROUTES.includes(getAppPathname())) {
    return;
  }

  const normalizeFilters = (
    filters: Record<string, FilterValue[] | undefined>,
  ): Record<string, FilterValue[] | undefined> =>
    Object.fromEntries(
      Object.entries(filters).filter(
        ([, value]) => value !== undefined && value.length > 0,
      ),
    );

  const normalizedFilters = normalizeFilters(state.filters);
  const normalizedDefaultFilters = normalizeFilters(defaultState.filters);

  const isDefault = (key: string, value: unknown) => {
    if (
      key === QUERY_PARAMS.FILTERS &&
      JSON.stringify(value) === JSON.stringify(normalizedDefaultFilters)
    ) {
      return true;
    }
    if (
      key === QUERY_PARAMS.FILTERS_INCLUDE &&
      JSON.stringify(value) === JSON.stringify(defaultState.filtersInclude)
    ) {
      return true;
    }
    if (
      key === QUERY_PARAMS.RANGE &&
      JSON.stringify(value) === JSON.stringify(defaultState.range)
    ) {
      return true;
    }
    if (
      key === QUERY_PARAMS.INCLUDE_UNDATED &&
      value === defaultState.includeUndated
    ) {
      return true;
    }
    if (key === QUERY_PARAMS.TEXT_SEARCH && value === defaultState.textSearch) {
      return true;
    }
    if (
      key === QUERY_PARAMS.TEXT_SEARCH_FIELDS &&
      JSON.stringify(value) === JSON.stringify(defaultState.textSearchFields)
    ) {
      return true;
    }
    return false;
  };

  const queryString = serializeFilterQueryState({
    [QUERY_PARAMS.FILTERS]: isDefault(QUERY_PARAMS.FILTERS, normalizedFilters)
      ? null
      : normalizedFilters,
    [QUERY_PARAMS.FILTERS_INCLUDE]: isDefault(
      QUERY_PARAMS.FILTERS_INCLUDE,
      state.filtersInclude,
    )
      ? null
      : state.filtersInclude,
    [QUERY_PARAMS.RANGE]: isDefault(QUERY_PARAMS.RANGE, state.range)
      ? null
      : state.range,
    [QUERY_PARAMS.INCLUDE_UNDATED]: isDefault(
      QUERY_PARAMS.INCLUDE_UNDATED,
      state.includeUndated,
    )
      ? null
      : state.includeUndated,
    [QUERY_PARAMS.TEXT_SEARCH]: isDefault(
      QUERY_PARAMS.TEXT_SEARCH,
      state.textSearch,
    )
      ? null
      : state.textSearch,
    [QUERY_PARAMS.TEXT_SEARCH_FIELDS]: isDefault(
      QUERY_PARAMS.TEXT_SEARCH_FIELDS,
      state.textSearchFields,
    )
      ? null
      : state.textSearchFields,
  });
  const appPathname = getAppPathname();
  const newUrl = buildAppUrl(appPathname, queryString);
  window.history.replaceState({}, "", newUrl);
};

type FilterAppliedContextType = {
  data: Item[];
  cities: Record<string, Point>;
  filters: Record<string, FilterValue[] | undefined>;
  filtersInclude: Record<string, boolean>;
  range: [number, number];
  includeUndated: boolean;
  textSearch: string;
  textSearchFields: (keyof Item)[];
  minYear: number;
  maxYear: number;
  applyFilters: (filterState: FilterState) => void;
  resetFilters: (setters: {
    setFilters: React.Dispatch<
      React.SetStateAction<Record<string, FilterValue[] | undefined>>
    >;
    setFiltersInclude: React.Dispatch<
      React.SetStateAction<Record<string, boolean>>
    >;
    setRange: React.Dispatch<React.SetStateAction<[number, number]>>;
    setIncludeUndated: React.Dispatch<React.SetStateAction<boolean>>;
    setTextSearch: React.Dispatch<React.SetStateAction<string>>;
    setTextSearchFields: React.Dispatch<React.SetStateAction<(keyof Item)[]>>;
  }) => void;
  updateHasUnappliedChanges: (hasChanges: boolean) => void;
  hasUnappliedChanges: boolean;
};

const FilterAppliedContext = createContext<
  FilterAppliedContextType | undefined
>(undefined);

export const useAppliedFilter = () => {
  const context = useContext(FilterAppliedContext);
  if (!context) {
    throw new Error(
      "useAppliedFilter must be used within a FilterAppliedProvider",
    );
  }
  return context;
};

const finiteFallback = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;

export const FilterAppliedProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [data, setData] = useState<Item[]>([]);
  const [cities, setCities] = useState<Record<string, Point>>({});
  const [minYear, maxYear] = useMemo(() => {
    const years = data
      .filter((t) => !!t.year)
      .map((t) => parseInt(t.year!.split("/")[0]));
    return [
      finiteFallback(Math.min(...years), MIN_YEAR),
      finiteFallback(Math.max(...years), MAX_YEAR),
    ];
  }, [data]);

  const getDefaultState = useCallback((): FilterState => {
    return {
      filters: {
        type: [
          {
            label: "Elements",
            value: "Elements",
          },
        ],
      } as Record<string, FilterValue[] | undefined>,
      filtersInclude: {},
      range: [minYear || 0, maxYear || 9999] as [number, number],
      includeUndated: true,
      textSearch: "",
      textSearchFields: ["shortTitle", "title", "titleEn"] as (keyof Item)[],
    };
  }, [minYear, maxYear]);

  const [appliedFilters, setAppliedFiltersState] = useState<FilterState>(() => {
    if (!NO_FILTER_ROUTES.includes(getAppPathname())) {
      const queryState = parseQueryParams();
      if (queryState) {
        return { ...getDefaultState(), ...queryState };
      }
    }

    return getDefaultState();
  });

  const setAppliedFilters = useCallback(
    (newFilters: FilterState) => {
      setAppliedFiltersState(newFilters);
      updateQueryParams(newFilters, getDefaultState());
    },
    [getDefaultState],
  );

  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      if (NO_FILTER_ROUTES.includes(getAppPathname())) {
        return;
      }

      const queryState = parseQueryParams();
      if (queryState) {
        const newState = { ...getDefaultState(), ...queryState };
        setAppliedFiltersState(newState);
      } else {
        const defaultState = getDefaultState();
        setAppliedFiltersState(defaultState);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [getDefaultState]);

  useEffect(() => {
    loadEditionsData(setData, true);
    loadCitiesAsync().then(setCities);
  }, []);

  const resetFilters = useCallback(
    (setters: {
      setFilters: React.Dispatch<
        React.SetStateAction<Record<string, FilterValue[] | undefined>>
      >;
      setFiltersInclude: React.Dispatch<
        React.SetStateAction<Record<string, boolean>>
      >;
      setRange: React.Dispatch<React.SetStateAction<[number, number]>>;
      setIncludeUndated: React.Dispatch<React.SetStateAction<boolean>>;
      setTextSearch: React.Dispatch<React.SetStateAction<string>>;
      setTextSearchFields: React.Dispatch<React.SetStateAction<(keyof Item)[]>>;
    }) => {
      const defaultState = getDefaultState();

      setters.setFilters(() => defaultState.filters);
      setters.setFiltersInclude(() => ({}));
      setters.setRange(defaultState.range);
      setters.setIncludeUndated(defaultState.includeUndated);
      setters.setTextSearch(defaultState.textSearch);
      setters.setTextSearchFields(defaultState.textSearchFields);

      setAppliedFilters(defaultState);
      setHasUnappliedChanges(false);
      if (!NO_FILTER_ROUTES.includes(getAppPathname())) {
        window.history.replaceState({}, "", buildAppUrl(getAppPathname()));
      }
    },
    [getDefaultState, setAppliedFilters],
  );

  const applyFilters = useCallback(
    (filterState: FilterState) => {
      setAppliedFilters(filterState);
      setHasUnappliedChanges(false);
    },
    [setAppliedFilters],
  );

  const updateHasUnappliedChanges = (hasChanges: boolean) => {
    setHasUnappliedChanges(hasChanges);
  };

  const value = useMemo(
    () => ({
      data,
      cities,
      filters: appliedFilters.filters,
      filtersInclude: appliedFilters.filtersInclude,
      range: appliedFilters.range,
      includeUndated: appliedFilters.includeUndated,
      textSearch: appliedFilters.textSearch,
      textSearchFields: appliedFilters.textSearchFields,
      minYear,
      maxYear,
      applyFilters,
      resetFilters,
      updateHasUnappliedChanges,
      hasUnappliedChanges,
    }),
    [
      data,
      cities,
      appliedFilters.filters,
      appliedFilters.filtersInclude,
      appliedFilters.range,
      appliedFilters.includeUndated,
      appliedFilters.textSearch,
      appliedFilters.textSearchFields,
      minYear,
      maxYear,
      applyFilters,
      resetFilters,
      hasUnappliedChanges,
    ],
  );

  return (
    <FilterAppliedContext.Provider value={value}>
      {children}
    </FilterAppliedContext.Provider>
  );
};
