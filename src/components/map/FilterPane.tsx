import styled from "@emotion/styled";
import { PANE_BORDER } from "../../utils/colors";
import { FiltersGroup } from "./FiltersGroup";
import { useAppliedFilter } from "../../contexts/FilterAppliedContext";
import { useEditFilter } from "../../contexts/FilterEditContext";
import { ScrollbarStyle } from "../common";
import RangeSlider from "../tps/filters/RangeSlider";
import { FilterButton as FilterToggleButton } from "../layout/FilterButton.tsx";
import { itemProperties } from "../../constants/itemProperties.ts";
import { NO_FILTER_ROUTES } from "../layout/routes.ts";
import { TextSearchFilter } from "./TextSearchFilter";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { FilterValue } from "./Filter";
import { useLocalStorage } from "usehooks-ts";
import { Item } from "../../types";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const FILTER_PANE_WIDTH = "26rem";

const Pane = styled.div<{ isLoading?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: ${FILTER_PANE_WIDTH};
  min-width: 256px;
  flex-shrink: 0;
  box-sizing: border-box;
  overflow-y: ${({ isLoading }) => (isLoading ? "hidden" : "auto")};
  overflow-x: hidden;
  background-color: white;
  color: black;
  padding: 1rem;
  border-right: 2px ${PANE_BORDER} solid;
  position: relative;
  pointer-events: ${({ isLoading }) => (isLoading ? "none" : "auto")};

  ${ScrollbarStyle};
`;

const StyledRangeSlider = styled(RangeSlider)`
  gap: 0.5rem;

  input {
    margin: 0;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  input[type="checkbox"] {
    margin: 0;
  }

  label {
    margin: 0;
    font-size: 0.9rem;
  }
`;

const FilterButton = styled.button`
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  border: 1px solid #ccc;

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ResetButton = styled(FilterButton)`
  background-color: #f5f5f5;
  color: #333;

  &:hover:not(:disabled) {
    background-color: #e9e9e9;
  }
`;

const ApplyButton = styled(FilterButton)<{ $hasChanges: boolean }>`
  background-color: ${(props) => (props.$hasChanges ? "#4CAF50" : "#e0e0e0")};
  color: ${(props) => (props.$hasChanges ? "white" : "#999")};
  font-weight: ${(props) => (props.$hasChanges ? "500" : "normal")};
  border-color: ${(props) => (props.$hasChanges ? "#4CAF50" : "#ccc")};

  &:hover:not(:disabled) {
    background-color: ${(props) => (props.$hasChanges ? "#45a049" : "#e0e0e0")};
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  border-radius: 0 0.7rem 0.7rem 0.7rem;
  pointer-events: all;
`;

const LoadingSpinner = styled(AiOutlineLoading3Quarters)`
  font-size: 2rem;
  animation: spin 1s linear infinite;
  color: #666;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  span {
    font-size: 0.9rem;
    color: #666;
  }
`;

export const FilterPane = () => {
  const {
    filteredItems,
    data,
    minYear,
    maxYear,
    resetFilters,
    isFiltering,
    applyFilters,
    hasUnappliedChanges,
    updateHasUnappliedChanges,
    filters: appliedFilters,
    filtersInclude: appliedFiltersInclude,
    range: appliedRange,
    includeUndated: appliedIncludeUndated,
    textSearch: appliedTextSearch,
    textSearchFields: appliedTextSearchFields,
  } = useAppliedFilter();
  const location = useLocation();

  const { filterOpen } = useEditFilter();

  const [range, setRange] = useLocalStorage<[number, number]>("time-range", [
    minYear,
    maxYear,
  ]);
  const [filters, setFilters] = useLocalStorage<
    Record<string, FilterValue[] | undefined>
  >("filters", {
    type: [
      {
        label: "Elements",
        value: "Elements",
      },
    ],
  });
  const [filtersInclude, setFiltersInclude] = useLocalStorage<
    Record<string, boolean>
  >("filter-include", {});
  const [includeUndated, setIncludeUndated] = useLocalStorage<boolean>(
    "include-undated",
    false,
  );
  const [textSearch, setTextSearch] = useLocalStorage<string>(
    "text-search",
    "",
  );
  const [textSearchFields, setTextSearchFields] = useLocalStorage<
    (keyof Item)[]
  >("text-search-fields", ["shortTitle", "title", "titleEn"]);

  useEffect(() => {
    setRange([minYear, maxYear]);
  }, [maxYear, minYear, setRange]);

  useEffect(() => {
    const hasChanges =
      JSON.stringify(filters) !== JSON.stringify(appliedFilters) ||
      JSON.stringify(filtersInclude) !==
        JSON.stringify(appliedFiltersInclude) ||
      JSON.stringify(range) !== JSON.stringify(appliedRange) ||
      includeUndated !== appliedIncludeUndated ||
      textSearch !== appliedTextSearch ||
      JSON.stringify(textSearchFields) !==
        JSON.stringify(appliedTextSearchFields);
    updateHasUnappliedChanges(hasChanges);
  }, [
    filters,
    filtersInclude,
    range,
    includeUndated,
    textSearch,
    textSearchFields,
    appliedFilters,
    appliedFiltersInclude,
    appliedRange,
    appliedIncludeUndated,
    appliedTextSearch,
    appliedTextSearchFields,
    updateHasUnappliedChanges,
  ]);

  if (
    !filterOpen ||
    !range[0] ||
    !range[1] ||
    filteredItems == null ||
    NO_FILTER_ROUTES.includes(location.pathname)
  ) {
    return null;
  }

  return (
    <Pane isLoading={isFiltering} onClick={(e) => e.stopPropagation()}>
      {isFiltering && (
        <LoadingOverlay>
          <LoadingText>
            <LoadingSpinner />
            <span>Applying filters...</span>
          </LoadingText>
        </LoadingOverlay>
      )}
      <FilterToggleButton />
      <ButtonRow>
        <ResetButton
          onClick={() =>
            resetFilters({
              setFilters,
              setFiltersInclude,
              setRange,
              setIncludeUndated,
              setTextSearch,
              setTextSearchFields,
            })
          }
          disabled={isFiltering}
        >
          Reset Filters
        </ResetButton>
        <ApplyButton
          onClick={() =>
            applyFilters({
              filters,
              filtersInclude,
              range,
              includeUndated,
              textSearch,
              textSearchFields,
            })
          }
          disabled={isFiltering || !hasUnappliedChanges}
          $hasChanges={hasUnappliedChanges}
        >
          {isFiltering ? "Applying..." : "Apply Filters"}
        </ApplyButton>
      </ButtonRow>
      <StyledRangeSlider
        min={minYear}
        max={maxYear}
        value={range}
        onChange={setRange}
      />

      <CheckboxContainer>
        <input
          type="checkbox"
          id="include-undated"
          checked={includeUndated}
          onChange={(e) => setIncludeUndated(e.target.checked)}
        />
        <label htmlFor="include-undated">Include undated</label>
      </CheckboxContainer>

      <TextSearchFilter
        textSearch={textSearch}
        setTextSearch={setTextSearch}
        textSearchFields={textSearchFields}
        setTextSearchFields={setTextSearchFields}
      />

      <FiltersGroup
        data={data}
        fields={itemProperties}
        filters={filters}
        setFilters={setFilters}
        filtersInclude={filtersInclude}
        setFiltersInclude={setFiltersInclude}
      />
    </Pane>
  );
};
