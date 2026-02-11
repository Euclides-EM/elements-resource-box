import { Dispatch, MouseEvent as ReactMouseEvent, SetStateAction } from "react";

export type HighlightTooltipState = {
  label: string;
  normalized: string;
  color: string;
  x: number;
  y: number;
};

type HighlightTooltipInfo = {
  label: string;
  normalized: string;
  color: string;
};

const TOOLTIP_OFFSET_X = 12;
const TOOLTIP_OFFSET_Y = 14;
const FEATURE_LABEL_SELECTOR = "[data-feature-label]";
const DEFAULT_FEATURE_COLOR = "#f2f2f2";

const getTooltipInfoFromTarget = (
  target: EventTarget | null,
): HighlightTooltipInfo | null => {
  if (!(target instanceof Element)) {
    return null;
  }
  const highlighted = target.closest(FEATURE_LABEL_SELECTOR);
  if (!(highlighted instanceof HTMLElement)) {
    return null;
  }
  const label = highlighted.dataset.featureLabel || "";
  if (!label) {
    return null;
  }
  return {
    label,
    normalized: highlighted.dataset.featureNormalized || "",
    color: highlighted.dataset.featureColor || DEFAULT_FEATURE_COLOR,
  };
};

const getTooltipPositionFromMouse = (
  event: ReactMouseEvent<HTMLElement>,
): { x: number; y: number } => ({
  x: event.clientX + TOOLTIP_OFFSET_X,
  y: event.clientY + TOOLTIP_OFFSET_Y,
});

export const handleHighlightTooltipMouseMove = (
  event: ReactMouseEvent<HTMLElement>,
  setTooltipState: Dispatch<SetStateAction<HighlightTooltipState | null>>,
) => {
  const info = getTooltipInfoFromTarget(event.target);
  if (!info) {
    setTooltipState((prev) => (prev ? null : prev));
    return;
  }

  const position = getTooltipPositionFromMouse(event);
  setTooltipState((prev) => {
    if (
      prev &&
      prev.label === info.label &&
      prev.normalized === info.normalized &&
      prev.color === info.color &&
      prev.x === position.x &&
      prev.y === position.y
    ) {
      return prev;
    }
    return {
      label: info.label,
      normalized: info.normalized,
      color: info.color,
      x: position.x,
      y: position.y,
    };
  });
};

export const handleHighlightTooltipMouseLeave = (
  setTooltipState: Dispatch<SetStateAction<HighlightTooltipState | null>>,
) => {
  setTooltipState(null);
};
