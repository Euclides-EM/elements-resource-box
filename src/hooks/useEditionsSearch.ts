import { useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useAppliedFilter } from "../contexts/FilterAppliedContext";
import { listAllEditions } from "../api/editionApi";
import { fetchDiagramDirectories } from "../api/diagramsApi";
import { mapEditionsToItems } from "../utils/dataUtils";
import type { FilterValue } from "../components/map/Filter";
import type { Item } from "../types";
import type { search_Query } from "../../hub-api";

const ITEM_FIELD_TO_EDITION_FIELD: Record<string, string> = {
  type: "isElements",
  languages: "languages",
  cities: "cities",
  authors: "editor",
  publishers: "publisher",
  study_corpora: "corpus",
  elementsBooksExpanded: "books",
  additionalContent: "additionalContent",
  class: "manuscriptClass",
  format: "format",
  volumesCount: "volumes",
  shortTitle: "shortTitle",
  title: "title",
  titleEn: "title_EN",
};

const VALUE_TRANSFORMS: Record<string, (values: string[]) => string[]> = {
  type: (values) => values.map((v) => (v === "Elements" ? "true" : "false")),
};

type FilterState = {
  filters: Record<string, FilterValue[] | undefined>;
  filtersInclude: Record<string, boolean>;
  range: [number, number];
  includeUndated: boolean;
  textSearch: string;
  textSearchFields: (keyof Item)[];
};

function buildSearchQuery(
  filterState: FilterState,
): Omit<search_Query, "offset" | "limit"> {
  const query: Omit<search_Query, "offset" | "limit"> = {};

  if (filterState.filters) {
    const fieldsFilter: Record<string, string[]> = {};
    for (const [field, values] of Object.entries(filterState.filters)) {
      if (!values || values.length === 0) continue;
      const backendField = ITEM_FIELD_TO_EDITION_FIELD[field] || field;
      let stringValues = values.map((v) => v.value);
      if (VALUE_TRANSFORMS[field]) {
        stringValues = VALUE_TRANSFORMS[field](stringValues);
      }
      fieldsFilter[backendField] = stringValues;
    }
    if (Object.keys(fieldsFilter).length > 0) {
      query.fields_filter = fieldsFilter;
    }
  }

  if (filterState.filtersInclude) {
    const filterIncludes: Record<string, boolean> = {};
    for (const [field, include] of Object.entries(filterState.filtersInclude)) {
      const backendField = ITEM_FIELD_TO_EDITION_FIELD[field] || field;
      filterIncludes[backendField] = include;
    }
    if (Object.keys(filterIncludes).length > 0) {
      query.filter_includes = filterIncludes;
    }
  }

  if (filterState.range) {
    query.range_filter = {
      year: {
        min: filterState.range[0],
        max: filterState.range[1],
      },
    };
  }

  if (filterState.textSearch) {
    query.text_search = filterState.textSearch;
    if (
      filterState.textSearchFields &&
      filterState.textSearchFields.length > 0
    ) {
      query.text_search_fields = filterState.textSearchFields.map(
        (f) => ITEM_FIELD_TO_EDITION_FIELD[f] || f,
      );
    }
  }

  return query;
}

export function useEditionsSearch() {
  const {
    filters,
    filtersInclude,
    range,
    includeUndated,
    textSearch,
    textSearchFields,
  } = useAppliedFilter();

  const searchQuery = useMemo(
    () =>
      buildSearchQuery({
        filters,
        filtersInclude,
        range,
        includeUndated,
        textSearch,
        textSearchFields,
      }),
    [
      filters,
      filtersInclude,
      range,
      includeUndated,
      textSearch,
      textSearchFields,
    ],
  );

  const diagramDirsQuery = useQuery({
    queryKey: ["diagram-directories"],
    queryFn: fetchDiagramDirectories,
    staleTime: Infinity,
  });

  const editionsQuery = useQuery({
    queryKey: ["editions", "search", searchQuery],
    queryFn: () => listAllEditions(searchQuery),
    placeholderData: keepPreviousData,
  });

  const items = useMemo(() => {
    if (!editionsQuery.data) return null;
    return mapEditionsToItems(
      editionsQuery.data,
      diagramDirsQuery.data ?? new Set(),
      true,
    );
  }, [editionsQuery.data, diagramDirsQuery.data]);

  return {
    items,
    isLoading: editionsQuery.isLoading,
    isFetching: editionsQuery.isFetching,
  };
}
