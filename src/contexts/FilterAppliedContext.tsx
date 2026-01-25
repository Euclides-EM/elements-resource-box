import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { Item, MAX_YEAR, MIN_YEAR } from "../types";
import { FilterValue } from "../components/map/Filter";
import { loadCitiesAsync, loadEditionsData } from "../utils/dataUtils";
import { Point } from "react-simple-maps";
import { NO_CITY } from "../constants";
import { itemProperties } from "../constants/itemProperties";
import { NO_FILTER_ROUTES } from "../components/layout/routes";

const STORAGE_KEY = "applied-filters";
const QUERY_PARAMS = {
  FILTERS: "filters",
  FILTERS_INCLUDE: "filtersInclude",
  RANGE: "range",
  INCLUDE_UNDATED: "includeUndated",
  TEXT_SEARCH: "textSearch",
  TEXT_SEARCH_FIELDS: "textSearchFields",
} as const;

type FilterState = {
  filters: Record<string, FilterValue[] | undefined>;
  filtersInclude: Record<string, boolean>;
  range: [number, number];
  includeUndated: boolean;
  textSearch: string;
  textSearchFields: (keyof Item)[];
};

const parseQueryParams = (): Partial<FilterState> | null => {
  const params = new URLSearchParams(window.location.search);
  const queryState: Partial<FilterState> = {};

  const filters = params.get(QUERY_PARAMS.FILTERS);
  if (filters) {
    try {
      queryState.filters = JSON.parse(decodeURIComponent(filters));
    } catch {
      console.error("Failed to parse filters from query params", filters);
    }
  }

  const filtersInclude = params.get(QUERY_PARAMS.FILTERS_INCLUDE);
  if (filtersInclude) {
    try {
      queryState.filtersInclude = JSON.parse(
        decodeURIComponent(filtersInclude),
      );
    } catch {
      console.error("Failed to parse filters from query params", filters);
    }
  }

  const range = params.get(QUERY_PARAMS.RANGE);
  if (range) {
    try {
      queryState.range = JSON.parse(decodeURIComponent(range));
    } catch {
      console.error("Failed to parse filters from query params", filters);
    }
  }

  const includeUndated = params.get(QUERY_PARAMS.INCLUDE_UNDATED);
  if (includeUndated !== null) {
    queryState.includeUndated = includeUndated === "true";
  }

  const textSearch = params.get(QUERY_PARAMS.TEXT_SEARCH);
  if (textSearch !== null) {
    queryState.textSearch = decodeURIComponent(textSearch);
  }

  const textSearchFields = params.get(QUERY_PARAMS.TEXT_SEARCH_FIELDS);
  if (textSearchFields) {
    try {
      queryState.textSearchFields = JSON.parse(
        decodeURIComponent(textSearchFields),
      );
    } catch {
      console.error("Failed to parse filters from query params", filters);
    }
  }

  return Object.keys(queryState).length > 0 ? queryState : null;
};

const updateQueryParams = (state: FilterState, defaultState: FilterState) => {
  // Don't update query params on pages without filters
  if (NO_FILTER_ROUTES.includes(window.location.pathname)) {
    return;
  }

  const params = new URLSearchParams();

  const isDefault = (key: string, value: unknown) => {
    if (
      key === QUERY_PARAMS.FILTERS &&
      JSON.stringify(value) === JSON.stringify(defaultState.filters)
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

  if (
    state.filters &&
    Object.keys(state.filters).length > 0 &&
    !isDefault(QUERY_PARAMS.FILTERS, state.filters)
  ) {
    params.set(
      QUERY_PARAMS.FILTERS,
      encodeURIComponent(JSON.stringify(state.filters)),
    );
  }

  if (
    state.filtersInclude &&
    Object.keys(state.filtersInclude).length > 0 &&
    !isDefault(QUERY_PARAMS.FILTERS_INCLUDE, state.filtersInclude)
  ) {
    params.set(
      QUERY_PARAMS.FILTERS_INCLUDE,
      encodeURIComponent(JSON.stringify(state.filtersInclude)),
    );
  }

  if (state.range && !isDefault(QUERY_PARAMS.RANGE, state.range)) {
    params.set(
      QUERY_PARAMS.RANGE,
      encodeURIComponent(JSON.stringify(state.range)),
    );
  }

  if (
    state.includeUndated !== undefined &&
    !isDefault(QUERY_PARAMS.INCLUDE_UNDATED, state.includeUndated)
  ) {
    params.set(QUERY_PARAMS.INCLUDE_UNDATED, String(state.includeUndated));
  }

  if (
    state.textSearch &&
    !isDefault(QUERY_PARAMS.TEXT_SEARCH, state.textSearch)
  ) {
    params.set(QUERY_PARAMS.TEXT_SEARCH, encodeURIComponent(state.textSearch));
  }

  if (
    state.textSearchFields &&
    state.textSearchFields.length > 0 &&
    !isDefault(QUERY_PARAMS.TEXT_SEARCH_FIELDS, state.textSearchFields)
  ) {
    params.set(
      QUERY_PARAMS.TEXT_SEARCH_FIELDS,
      encodeURIComponent(JSON.stringify(state.textSearchFields)),
    );
  }

  const queryString = params.toString();
  const newUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;
  window.history.replaceState({}, "", newUrl);
};

type FilterAppliedContextType = {
  data: Item[];
  cities: Record<string, Point>;
  filteredItems: Item[] | null;
  filters: Record<string, FilterValue[] | undefined>;
  filtersInclude: Record<string, boolean>;
  range: [number, number];
  includeUndated: boolean;
  textSearch: string;
  textSearchFields: (keyof Item)[];
  minYear: number;
  maxYear: number;
  isFiltering: boolean;
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

  const [isFiltering, setIsFiltering] = useState(false);
  const isFilteringRef = useRef(false);
  const [internalFilteredItems, setInternalFilteredItems] = useState<
    Item[] | null
  >(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingMessageRef = useRef<MessageEvent | null>(null);
  const dataRef = useRef<Item[]>([]);

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
    // Don't read query params on pages without filters
    if (!NO_FILTER_ROUTES.includes(window.location.pathname)) {
      const queryState = parseQueryParams();
      if (queryState) {
        return { ...getDefaultState(), ...queryState };
      }
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const storedState = JSON.parse(stored);
        updateQueryParams(storedState, getDefaultState());
        return storedState;
      } catch {
        console.error("Failed to parse stored applied filters", stored);
      }
    }

    return getDefaultState();
  });

  const setAppliedFilters = useCallback(
    (newFilters: FilterState) => {
      setAppliedFiltersState(newFilters);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFilters));
      updateQueryParams(newFilters, getDefaultState());
    },
    [getDefaultState],
  );

  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      // Don't process query params on pages without filters
      if (NO_FILTER_ROUTES.includes(window.location.pathname)) {
        return;
      }

      const queryState = parseQueryParams();
      if (queryState) {
        const newState = { ...getDefaultState(), ...queryState };
        setAppliedFiltersState(newState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } else {
        const defaultState = getDefaultState();
        setAppliedFiltersState(defaultState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
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

    workerRef.current = new Worker("/filterWorker.js");

    workerRef.current.addEventListener("message", (e: MessageEvent) => {
      setInternalFilteredItems(e.data);
      isFilteringRef.current = false;
      setIsFiltering(false);

      if (pendingMessageRef.current) {
        const pending = pendingMessageRef.current;
        pendingMessageRef.current = null;
        setTimeout(() => {
          workerRef.current?.postMessage(pending.data);
          isFilteringRef.current = true;
          setIsFiltering(true);
        }, 0);
      }
    });

    return () => {
      workerRef.current?.terminate();
    };
  }, [minYear, maxYear]);

  useEffect(() => {
    dataRef.current = data;
    if (data.length > 0) {
      setAppliedFiltersState((prev) => ({ ...prev }));
    }
  }, [data]);

  useEffect(() => {
    if (!workerRef.current || dataRef.current.length === 0) {
      return;
    }

    const message = {
      data: dataRef.current,
      range: appliedFilters.range,
      filters: appliedFilters.filters,
      filtersInclude: appliedFilters.filtersInclude,
      includeUndated: appliedFilters.includeUndated,
      textSearch: appliedFilters.textSearch,
      textSearchFields: appliedFilters.textSearchFields,
      NO_CITY,
    };

    if (isFilteringRef.current) {
      pendingMessageRef.current = { data: message } as MessageEvent;
    } else {
      isFilteringRef.current = true;
      setIsFiltering(true);
      workerRef.current.postMessage(message);
    }
  }, [appliedFilters]);

  const filteredItems = internalFilteredItems;

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
      const defaultFilters: Record<string, FilterValue[] | undefined> = {};

      const allFilterKeys = Object.keys(itemProperties).filter(
        (key) => !itemProperties[key].notFilterable,
      );

      allFilterKeys.forEach((key) => {
        if (key !== "type") {
          defaultFilters[key] = undefined;
        }
      });

      const defaultState = {
        filters: defaultFilters,
        filtersInclude: {},
        range: [minYear, maxYear] as [number, number],
        includeUndated: false,
        textSearch: "",
        textSearchFields: ["shortTitle", "title", "titleEn"] as (keyof Item)[],
      };

      setters.setFilters(() => defaultState.filters);
      setters.setFiltersInclude(() => ({}));
      setters.setRange(defaultState.range);
      setters.setIncludeUndated(defaultState.includeUndated);
      setters.setTextSearch(defaultState.textSearch);
      setters.setTextSearchFields(defaultState.textSearchFields);

      setAppliedFilters(defaultState);
      setHasUnappliedChanges(false);
      // Only clear URL if not on a no-filter route
      if (!NO_FILTER_ROUTES.includes(window.location.pathname)) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    },
    [maxYear, minYear, setAppliedFilters],
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
      filteredItems,
      filters: appliedFilters.filters,
      filtersInclude: appliedFilters.filtersInclude,
      range: appliedFilters.range,
      includeUndated: appliedFilters.includeUndated,
      textSearch: appliedFilters.textSearch,
      textSearchFields: appliedFilters.textSearchFields,
      minYear,
      maxYear,
      isFiltering,
      applyFilters,
      resetFilters,
      updateHasUnappliedChanges,
      hasUnappliedChanges,
    }),
    [
      data,
      cities,
      filteredItems,
      appliedFilters.filters,
      appliedFilters.filtersInclude,
      appliedFilters.range,
      appliedFilters.includeUndated,
      appliedFilters.textSearch,
      appliedFilters.textSearchFields,
      minYear,
      maxYear,
      isFiltering,
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
