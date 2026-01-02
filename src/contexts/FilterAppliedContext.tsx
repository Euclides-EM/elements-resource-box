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
import { Item } from "../types";
import { FilterValue } from "../components/map/Filter";
import { loadCitiesAsync, loadEditionsData } from "../utils/dataUtils";
import { Point } from "react-simple-maps";
import { NO_CITY } from "../constants";

type FilterAppliedContextType = {
  data: Item[];
  cities: Record<string, Point>;
  filteredItems: Item[];
  filters: Record<string, FilterValue[] | undefined>;
  filtersInclude: Record<string, boolean>;
  range: [number, number];
  includeUndated: boolean;
  textSearch: string;
  textSearchFields: (keyof Item)[];
  minYear: number;
  maxYear: number;
  isFiltering: boolean;
  applyFilters: (filterState: {
    filters: Record<string, FilterValue[] | undefined>;
    filtersInclude: Record<string, boolean>;
    range: [number, number];
    includeUndated: boolean;
    textSearch: string;
    textSearchFields: (keyof Item)[];
  }) => void;
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
    return [Math.min(...years), Math.max(...years)];
  }, [data]);

  const [isFiltering, setIsFiltering] = useState(false);
  const [internalFilteredItems, setInternalFilteredItems] = useState<Item[]>(
    [],
  );
  const workerRef = useRef<Worker | null>(null);
  const pendingMessageRef = useRef<MessageEvent | null>(null);
  const dataRef = useRef<Item[]>([]);

  const [appliedFilters, setAppliedFiltersState] = useState<{
    filters: Record<string, FilterValue[] | undefined>;
    filtersInclude: Record<string, boolean>;
    range: [number, number];
    includeUndated: boolean;
    textSearch: string;
    textSearchFields: (keyof Item)[];
  }>(() => {
    const stored = localStorage.getItem("applied-filters");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        console.error("Failed to parse stored applied filters", stored);
      }
    }
    return {
      filters: {
        type: [
          {
            label: "Elements",
            value: "Elements",
          },
        ],
      },
      filtersInclude: {},
      range: [minYear || 0, maxYear || 9999],
      includeUndated: true,
      textSearch: "",
      textSearchFields: ["shortTitle", "title", "titleEn"] as (keyof Item)[],
    };
  });

  const setAppliedFilters = useCallback((newFilters: typeof appliedFilters) => {
    setAppliedFiltersState(newFilters);
    localStorage.setItem("applied-filters", JSON.stringify(newFilters));
  }, []);

  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);

  useEffect(() => {
    loadEditionsData(setData, true);
    loadCitiesAsync().then(setCities);

    workerRef.current = new Worker("/filterWorker.js");

    workerRef.current.addEventListener("message", (e: MessageEvent) => {
      setInternalFilteredItems(e.data);
      setIsFiltering(false);

      if (pendingMessageRef.current) {
        const pending = pendingMessageRef.current;
        pendingMessageRef.current = null;
        setTimeout(() => {
          workerRef.current?.postMessage(pending.data);
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
    if (!workerRef.current || dataRef.current.length === 0) return;

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

    if (isFiltering) {
      pendingMessageRef.current = { data: message } as MessageEvent;
    } else {
      setIsFiltering(true);
      workerRef.current.postMessage(message);
    }
  }, [appliedFilters, isFiltering]);

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
      const defaultFilters = {
        type: [
          {
            label: "Elements",
            value: "Elements",
          },
        ],
      };
      setters.setFilters(defaultFilters);
      setters.setFiltersInclude({});
      setters.setRange([minYear, maxYear]);
      setters.setIncludeUndated(true);
      setters.setTextSearch("");
      setters.setTextSearchFields(["shortTitle", "title", "titleEn"]);

      setAppliedFilters({
        filters: defaultFilters,
        filtersInclude: {},
        range: [minYear, maxYear],
        includeUndated: true,
        textSearch: "",
        textSearchFields: ["shortTitle", "title", "titleEn"],
      });
      setHasUnappliedChanges(false);
    },
    [maxYear, minYear, setAppliedFilters],
  );

  const applyFilters = useCallback(
    (filterState: {
      filters: Record<string, FilterValue[] | undefined>;
      filtersInclude: Record<string, boolean>;
      range: [number, number];
      includeUndated: boolean;
      textSearch: string;
      textSearchFields: (keyof Item)[];
    }) => {
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
