import { useCallback, useEffect, useState } from "react";
import { MdPause, MdPlayArrow } from "react-icons/md";
import styled from "@emotion/styled";
import { ButtonStyle, TRANSPARENT_WHITE } from "../../utils/colors";
import { TOOLTIP_TIMELINE_BUTTON } from "./MapTooltips.tsx";
import { TIMELINE_PLAY_ID, TIMELINE_RANGE_ID } from "./Tour";
import RangeSlider from "../../RangeSlider.tsx";
import { useAppliedFilter } from "../../contexts/FilterAppliedContext";

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
  const { range, minYear, maxYear } = useAppliedFilter();
  const [localRange, setLocalRange] = useState<[number, number]>(range);
  const [isPlay, setPlay] = useState<boolean>(false);

  const playStep = useCallback(
    () =>
      setLocalRange(([from, to]) => {
        to = Math.min(maxYear, to + PLAY_STEP_YEARS);
        if (to >= maxYear) {
          setPlay(false);
        }
        return [from, to];
      }),
    [maxYear],
  );

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
            onChange={setLocalRange}
          />
        )}
      </RangeWrapper>
    </>
  );
};
