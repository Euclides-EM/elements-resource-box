import { useCallback, useEffect, useRef, useState } from "react";
import { MdPause, MdPlayArrow } from "react-icons/md";
import styled from "@emotion/styled";
import { ButtonStyle, TRANSPARENT_WHITE } from "../../utils/colors";
import { TOOLTIP_TIMELINE_BUTTON } from "./MapTooltips.tsx";
import { TIMELINE_PLAY_ID, TIMELINE_RANGE_ID } from "./Tour";
import RangeSlider from "../../RangeSlider.tsx";
import { useAppliedFilter } from "../../contexts/FilterAppliedContext";
import { useLocalStorage } from "usehooks-ts";

const PlayButton = styled.div`
  ${ButtonStyle};
  svg {
    margin-bottom: 2px;
  }
`;

const StyledRangeSlider = styled(RangeSlider)`
  height: 0.5rem;
  gap: 0.5rem;
  input[type="number"] {
    color: black;
    background-color: ${TRANSPARENT_WHITE};
  }
  @media (max-width: 768px) {
    width: 40vw;
    gap: 0;
  }
`;

const RangeWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  height: 100%;
  align-items: center;
`;

const PLAY_STEP_YEARS = 10;
const PLAY_STEP_SEC = 1;

export const Timeline = () => {
  const {
    range,
    minYear,
    maxYear,
    applyFilters,
    filters,
    filtersInclude,
    includeUndated,
    textSearch,
    textSearchFields,
  } = useAppliedFilter();
  const [localRange, setLocalRange] = useState<[number, number]>(range);
  const [isPlay, setPlay] = useState<boolean>(false);
  const [, setStoredRange] = useLocalStorage<[number, number]>(
    "time-range",
    range,
  );
  const localRangeRef = useRef<[number, number]>(localRange);
  const appliedRef = useRef({
    range,
    filters,
    filtersInclude,
    includeUndated,
    textSearch,
    textSearchFields,
  });
  const debounceRef = useRef<number | null>(null);
  const APPLY_DEBOUNCE_MS = 300;

  useEffect(() => {
    localRangeRef.current = localRange;
  }, [localRange]);

  useEffect(() => {
    if (range[0] !== localRange[0] || range[1] !== localRange[1]) {
      setLocalRange(range);
    }
  }, [range, localRange]);

  useEffect(() => {
    appliedRef.current = {
      range,
      filters,
      filtersInclude,
      includeUndated,
      textSearch,
      textSearchFields,
    };
  }, [
    range,
    filters,
    filtersInclude,
    includeUndated,
    textSearch,
    textSearchFields,
  ]);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const scheduleApply = useCallback(
    (nextRange: [number, number]) => {
      setLocalRange(nextRange);
      setStoredRange(nextRange);
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(() => {
        const applied = appliedRef.current;
        if (
          nextRange[0] === applied.range[0] &&
          nextRange[1] === applied.range[1]
        ) {
          return;
        }
        applyFilters({
          filters: applied.filters,
          filtersInclude: applied.filtersInclude,
          range: nextRange,
          includeUndated: applied.includeUndated,
          textSearch: applied.textSearch,
          textSearchFields: applied.textSearchFields,
        });
      }, APPLY_DEBOUNCE_MS);
    },
    [applyFilters, setStoredRange],
  );

  const playStep = useCallback(() => {
    const [from, to] = localRangeRef.current;
    const nextTo = Math.min(maxYear, to + PLAY_STEP_YEARS);
    if (nextTo >= maxYear) {
      setPlay(false);
    }
    scheduleApply([from, nextTo]);
  }, [maxYear, scheduleApply]);

  useEffect(() => {
    if (!isPlay) {
      return;
    }
    const id = setInterval(playStep, PLAY_STEP_SEC * 1000);
    return () => clearTimeout(id);
  }, [isPlay, playStep]);

  return (
    <>
      <PlayButton
        id={TIMELINE_PLAY_ID}
        onClick={() => setPlay((p) => !p)}
        data-tooltip-id={TOOLTIP_TIMELINE_BUTTON}
        data-tooltip-content={isPlay ? "Pause" : "Play"}
      >
        {isPlay ? <MdPause /> : <MdPlayArrow />}
      </PlayButton>
      <RangeWrapper id={TIMELINE_RANGE_ID}>
        {localRange[0] > 0 && localRange[1] > 0 && (
          <StyledRangeSlider
            min={minYear}
            max={maxYear}
            value={localRange}
            onChange={scheduleApply}
            emitOnChange
          />
        )}
      </RangeWrapper>
    </>
  );
};
