import styled from "@emotion/styled";
import { Row } from "../../common.ts";
import { useEffect, useRef, useState } from "react";
import { RANGE_FILL, SEA_COLOR } from "../../../utils/colors.ts";

export type RangeSliderProps = {
  className?: string;
  name?: string;
  value: [number, number];
  min: number;
  max: number;
  onChange: (value: [number, number]) => void;
};

const SliderContainer = styled.div`
  display: flex;
  position: relative;
  width: 20rem;
  height: 1rem;
  align-items: center;
`;

const SliderTrack = styled.div`
  position: absolute;
  width: 100%;
  height: 0.25rem;
  background-color: #ddd;
  border-radius: 0.125rem;
`;

const SliderRange = styled.div<{
  left: number;
  width: number;
  min: number;
  max: number;
}>`
  position: absolute;
  left: ${({ left, min, max }) => ((left - min) / (max - min)) * 100}%;
  width: ${({ width, min, max }) => (width / (max - min)) * 100}%;
  height: 0.25rem;
  background-color: ${RANGE_FILL};
  border-radius: 0.125rem;
`;

const SliderInput = styled.input`
  position: absolute;
  width: 100%;
  margin: 0;
  background-color: transparent;
  -webkit-appearance: none;
  appearance: none;
  pointer-events: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 1rem;
    width: 1rem;
    border-radius: 50%;
    background: #ddd;
    border: 0.125rem solid ${RANGE_FILL};
    cursor: pointer;
    pointer-events: auto;
  }

  &::-webkit-slider-thumb:active {
    transform: scale(1.5);
  }
`;

const MinInput = styled(SliderInput)``;

const MaxInput = styled(SliderInput)``;

const ValueInput = styled.input`
  margin: 0 0.5rem;
  width: 4rem;
  height: 2rem;
  text-align: center;
  border: 1px solid ${SEA_COLOR};
  border-radius: 4px;
  padding: 2px 4px;
  background-color: white;
  color: ${RANGE_FILL};

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type="number"] {
    -moz-appearance: textfield;
  }
`;

export const RangeSlider = ({
  className,
  name,
  value,
  min,
  max,
  onChange,
}: RangeSliderProps) => {
  const [minInputValue, setMinInputValue] = useState(value[0].toString());
  const [maxInputValue, setMaxInputValue] = useState(value[1].toString());
  const prevValueRef = useRef<[number, number]>(value);

  useEffect(() => {
    if (
      value[0] !== prevValueRef.current[0] ||
      value[1] !== prevValueRef.current[1]
    ) {
      setMinInputValue(value[0].toString());
      setMaxInputValue(value[1].toString());
      prevValueRef.current = value;
    }
  }, [value]);

  console.error("valie", value);

  return (
    <Row justifyStart noWrap noWrapAlsoOnMobile className={className}>
      {name && <div>{name}:</div>}
      <ValueInput
        type="number"
        min={min}
        max={value[1]}
        value={minInputValue}
        onChange={(e) => setMinInputValue(e.target.value)}
        onBlur={() => {
          const newMin = parseInt(minInputValue);
          if (!isNaN(newMin)) {
            const clampedMin = Math.max(min, Math.min(newMin, value[1]));
            setMinInputValue(clampedMin.toString());
            if (clampedMin !== value[0]) {
              onChange([clampedMin, value[1]]);
            }
          } else {
            setMinInputValue(value[0].toString());
          }
        }}
      />
      <SliderContainer>
        <SliderTrack id="range-slider-track" />
        <SliderRange
          left={value[0]}
          width={value[1] - value[0]}
          min={min}
          max={max}
        />
        <MinInput
          type="range"
          min={min}
          max={max}
          value={value[0]}
          onChange={(e) => {
            const newMin = parseInt(e.target.value);
            if (newMin <= value[1] && newMin !== value[0]) {
              onChange([newMin, value[1]]);
            }
          }}
        />
        <MaxInput
          type="range"
          min={min}
          max={max}
          value={value[1]}
          onChange={(e) => {
            const newMax = parseInt(e.target.value);
            if (newMax >= value[0] && newMax !== value[1]) {
              onChange([value[0], newMax]);
            }
          }}
        />
      </SliderContainer>
      <ValueInput
        type="number"
        min={value[0]}
        max={max}
        value={maxInputValue}
        onChange={(e) => setMaxInputValue(e.target.value)}
        onBlur={() => {
          const newMax = parseInt(maxInputValue);
          if (!isNaN(newMax)) {
            const clampedMax = Math.min(max, Math.max(newMax, value[0]));
            setMaxInputValue(clampedMax.toString());
            if (clampedMax !== value[1]) {
              onChange([value[0], clampedMax]);
            }
          } else {
            setMaxInputValue(value[1].toString());
          }
        }}
      />
    </Row>
  );
};

export default RangeSlider;
