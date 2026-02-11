import { Feature } from "../../../types";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { TeiService } from "../../../../common/hub-api";
import { COLLECTION_ID } from "../../../utils/hubApi";
import FeatureHighlightTooltip from "./FeatureHighlightTooltip";
import {
  handleHighlightTooltipMouseLeave,
  handleHighlightTooltipMouseMove,
  HighlightTooltipState,
} from "./highlightTooltipUtils";

export type HighlightSpan = {
  id: string;
  start: number;
  end: number;
  featureKey: string;
  normalized: string;
  source: "tei" | "local";
};

export type HighlightSelection = {
  start: number;
  end: number;
  text: string;
  x: number;
  y: number;
};

export type HighlightAction = {
  id: string;
  featureKey: string;
  start: number;
  end: number;
  text: string;
  label: string;
  normalized: string;
  color: string;
};

type HighlightedTextProps = {
  text: string;
  features: Feature[];
  featureColors: Record<string, string>;
  featureNamesById: Record<string, string>;
  itemKey: string;
  apiReady: boolean;
  hideFeatureHighlights?: boolean;
  editable?: boolean;
  addedHighlights?: HighlightSpan[];
  removedHighlightIds?: Set<string>;
  onRequestAddAnnotation?: (selection: HighlightSelection) => void;
  onRemoveHighlight?: (highlight: HighlightAction) => void;
};

const OUTLINE_FEATURES = ["action_verbs"];

const TEI_NS = "http://www.tei-c.org/ns/1.0";
const teiCache = new Map<string, string>();
const teiPromiseCache = new Map<string, Promise<string>>();

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const escapeHtmlAttr = (value: string) =>
  escapeHtml(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const wrapNonInteractive = (value: string) =>
  value ? `<span style="pointer-events: none;">${value}</span>` : "";

const buildTextHtml = (text: string) =>
  escapeHtml(text)
    .replaceAll("\n", "<br/>")
    .replace(/^(?:<br\/>|\s)+/, "")
    .replace(/(?:<br\/>|\s)+$/, "");

const normalizeDisplayText = (value: string) => value.trim();

const buildHighlightLayers = (
  trimmedText: string,
  spans: HighlightSpan[],
  featureColors: Record<string, string> | undefined,
  featureNamesById: Record<string, string> | undefined,
) => {
  if (!trimmedText || spans.length === 0) {
    return [];
  }

  return spans
    .map((span, index) => ({
      ...span,
      length: span.end - span.start,
      originalIndex: index,
    }))
    .sort((a, b) => b.length - a.length)
    .map((span, layerIndex, sorted) => {
      const color = featureColors?.[span.featureKey];
      if (!color) {
        return "";
      }
      const useOutline = OUTLINE_FEATURES.includes(span.featureKey);
      const depth = sorted.reduce((count, other, idx) => {
        if (idx <= layerIndex) return count;
        if (span.start < other.end && span.end > other.start) {
          return count + 1;
        }
        return count;
      }, 0);
      const shadowSize = Math.min(6, 2 + depth * 2);
      const style = useOutline
        ? `outline: 2px solid ${color}; outline-offset: 2px; border-radius: 8px; pointer-events: auto;`
        : `background-color: ${color}; box-shadow: 0 0 0 ${shadowSize}px ${color}; border-radius: 8px; pointer-events: auto;`;
      const featureLabel =
        featureNamesById?.[span.featureKey] || span.featureKey;
      const tooltip = escapeHtmlAttr(featureLabel);
      const tooltipColor = escapeHtmlAttr(color);
      const tooltipNormalized = escapeHtmlAttr(span.normalized);
      const tooltipNormalizedAttr = tooltipNormalized
        ? ` data-feature-normalized="${tooltipNormalized}"`
        : "";
      const featureKeyAttr = escapeHtmlAttr(span.featureKey);
      const highlightIdAttr = escapeHtmlAttr(span.id);

      const before = trimmedText.slice(0, span.start);
      const segment = trimmedText.slice(span.start, span.end);
      const after = trimmedText.slice(span.end);
      let html =
        wrapNonInteractive(escapeHtml(before)) +
        `<span style="${style}" data-feature-label="${tooltip}" data-feature-color="${tooltipColor}" data-feature-key="${featureKeyAttr}" data-feature-start="${span.start}" data-feature-end="${span.end}" data-highlight-id="${highlightIdAttr}"${tooltipNormalizedAttr}>${escapeHtml(segment)}</span>` +
        wrapNonInteractive(escapeHtml(after));
      html = html.replaceAll("\n", "<br/>");
      html = html.replace(/^(?:<br\/>|\s)+/, "");
      html = html.replace(/(?:<br\/>|\s)+$/, "");
      return html;
    })
    .filter(Boolean);
};

const buildHighlightHitLayers = (
  trimmedText: string,
  spans: HighlightSpan[],
  featureColors: Record<string, string> | undefined,
  featureNamesById: Record<string, string> | undefined,
) => {
  if (!trimmedText || spans.length === 0) {
    return [];
  }

  return spans
    .map((span, index) => ({
      ...span,
      length: span.end - span.start,
      originalIndex: index,
    }))
    .sort((a, b) => b.length - a.length)
    .map((span) => {
      const style =
        "pointer-events: auto; background-color: transparent; box-shadow: none; border-radius: 8px; outline: none;";
      const featureLabel =
        featureNamesById?.[span.featureKey] || span.featureKey;
      const tooltip = escapeHtmlAttr(featureLabel);
      const tooltipColor = escapeHtmlAttr(
        featureColors?.[span.featureKey] || "#f2f2f2",
      );
      const tooltipNormalized = escapeHtmlAttr(span.normalized);
      const tooltipNormalizedAttr = tooltipNormalized
        ? ` data-feature-normalized="${tooltipNormalized}"`
        : "";
      const featureKeyAttr = escapeHtmlAttr(span.featureKey);
      const highlightIdAttr = escapeHtmlAttr(span.id);

      const before = trimmedText.slice(0, span.start);
      const segment = trimmedText.slice(span.start, span.end);
      const after = trimmedText.slice(span.end);
      let html =
        wrapNonInteractive(escapeHtml(before)) +
        `<span style="${style}" data-feature-label="${tooltip}" data-feature-color="${tooltipColor}" data-feature-key="${featureKeyAttr}" data-feature-start="${span.start}" data-feature-end="${span.end}" data-highlight-id="${highlightIdAttr}"${tooltipNormalizedAttr}>${escapeHtml(segment)}</span>` +
        wrapNonInteractive(escapeHtml(after));
      html = html.replaceAll("\n", "<br/>");
      html = html.replace(/^(?:<br\/>|\s)+/, "");
      html = html.replace(/(?:<br\/>|\s)+$/, "");
      return html;
    })
    .filter(Boolean);
};

const parseTeiToSpans = (
  tei: string,
  selectedFeatures: Feature[],
): { baseHtml: string; spans: HighlightSpan[]; text: string } | null => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(tei, "text/xml");
  const parseError = doc.getElementsByTagName("parsererror")[0];
  if (parseError) {
    return null;
  }

  const respStatements = doc.getElementsByTagNameNS(TEI_NS, "respStmt");
  const respToFeature: Record<string, string> = {};
  Array.from(respStatements).forEach((respStmt) => {
    const respId =
      respStmt.getAttribute("xml:id") || respStmt.getAttribute("id");
    if (!respId) return;
    const idnos = respStmt.getElementsByTagNameNS(TEI_NS, "idno");
    const featureIdno = Array.from(idnos).find(
      (node) => node.getAttribute("type") === "feature",
    );
    const featureKey = featureIdno?.textContent?.trim();
    if (featureKey) {
      respToFeature[respId] = featureKey;
    }
  });

  const selectedSet = new Set(selectedFeatures);

  const body = doc.getElementsByTagNameNS(TEI_NS, "body")[0];
  if (!body) {
    return null;
  }

  const anchorPos: Record<string, number> = {};
  let rawText = "";

  const walkNode = (node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      rawText += node.textContent || "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const element = node as Element;
    const name = element.localName;
    if (name === "anchor") {
      const anchorId =
        element.getAttribute("xml:id") || element.getAttribute("id");
      if (anchorId) {
        anchorPos[anchorId] = rawText.length;
      }
      return;
    }
    if (name === "lb") {
      rawText += "\n";
      return;
    }

    element.childNodes.forEach(walkNode);

    if (name === "p") {
      rawText += "\n";
    }
  };

  body.childNodes.forEach(walkNode);

  const spanGroups = doc.getElementsByTagNameNS(TEI_NS, "spanGrp");
  const filteredSpans: Array<{
    start: number;
    end: number;
    featureKey: string;
    normalized: string;
  }> = [];
  Array.from(spanGroups).forEach((group) => {
    if (group.getAttribute("type") !== "highlight") {
      return;
    }
    const spans = group.getElementsByTagNameNS(TEI_NS, "span");
    Array.from(spans).forEach((span) => {
      const from = span.getAttribute("from")?.replace("#", "");
      const to = span.getAttribute("to")?.replace("#", "");
      const resp = span.getAttribute("resp")?.replace("#", "");
      if (!from || !to || !resp) return;
      const startIdx = anchorPos[from];
      const endIdx = anchorPos[to];
      if (startIdx === undefined || endIdx === undefined) {
        return;
      }
      const spanId =
        span.getAttribute("xml:id") || span.getAttribute("id") || "";
      let featureKey = "";
      if (spanId.startsWith("h-")) {
        const lastDash = spanId.lastIndexOf("-");
        if (lastDash > 2) {
          featureKey = spanId.slice(2, lastDash);
        }
      }
      if (!featureKey) {
        featureKey = respToFeature[resp] || "";
      }
      if (!featureKey) return;
      const start = Math.min(startIdx, endIdx);
      const end = Math.max(startIdx, endIdx);
      if (end <= start) {
        return;
      }
      const normalized =
        Array.from(span.getElementsByTagNameNS(TEI_NS, "f"))
          .find((node) => node.getAttribute("name") === "normalized")
          ?.textContent?.trim() || "";
      const spanEntry = { start, end, featureKey, normalized };
      if (selectedSet.size === 0 || selectedSet.has(featureKey)) {
        filteredSpans.push(spanEntry);
      }
    });
  });

  const leadingWhitespace = rawText.match(/^\s*/)?.[0].length ?? 0;
  const trimmedText = rawText.trim();
  const baseHtml = buildTextHtml(trimmedText);

  const adjustedSpans = filteredSpans
    .map((span) => ({
      ...span,
      start: span.start - leadingWhitespace,
      end: span.end - leadingWhitespace,
    }))
    .filter((span) => span.end > 0 && span.start < trimmedText.length)
    .map((span) => ({
      ...span,
      start: Math.max(0, span.start),
      end: Math.min(trimmedText.length, span.end),
    }))
    .filter((span) => span.end > span.start);

  const spans: HighlightSpan[] = adjustedSpans.map((span) => {
    const id = `${span.featureKey}:${span.start}-${span.end}:${span.normalized || "raw"}`;
    return { ...span, id, source: "tei" };
  });

  return { baseHtml, spans, text: trimmedText };
};

const HighlightedText = memo(
  ({
    text,
    features,
    featureColors,
    featureNamesById,
    itemKey,
    apiReady,
    hideFeatureHighlights = false,
    editable = false,
    addedHighlights = [],
    removedHighlightIds,
    onRequestAddAnnotation,
    onRemoveHighlight,
  }: HighlightedTextProps) => {
    const [renderedHtml, setRenderedHtml] = useState<string>("");
    const [isReady, setIsReady] = useState(false);
    const [tooltipState, setTooltipState] =
      useState<HighlightTooltipState | null>(null);
    const [tooltipPinned, setTooltipPinned] = useState(false);
    const [teiSpans, setTeiSpans] = useState<HighlightSpan[]>([]);
    const [displayText, setDisplayText] = useState("");
    const [selectionState, setSelectionState] =
      useState<HighlightSelection | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const plainHtml = useMemo(() => buildTextHtml(text), [text]);
    const normalizedPlainText = useMemo(
      () => normalizeDisplayText(text),
      [text],
    );

    const combinedSpans = useMemo(() => {
      const selectedSet = new Set(features);
      const includeSpan = (span: HighlightSpan) =>
        selectedSet.size === 0 || selectedSet.has(span.featureKey);
      const removedIds = removedHighlightIds ?? new Set<string>();
      const merged = [
        ...teiSpans.filter((span) => !removedIds.has(span.id)),
        ...addedHighlights,
      ];
      const normalizedText = displayText || normalizedPlainText;
      return merged
        .map((span) => ({
          ...span,
          start: Math.max(0, Math.min(span.start, normalizedText.length)),
          end: Math.max(0, Math.min(span.end, normalizedText.length)),
        }))
        .filter((span) => span.end > span.start)
        .filter((span) => includeSpan(span));
    }, [
      addedHighlights,
      displayText,
      features,
      normalizedPlainText,
      removedHighlightIds,
      teiSpans,
    ]);

    const renderedLayers = useMemo(
      () =>
        buildHighlightLayers(
          displayText || normalizedPlainText,
          combinedSpans,
          featureColors,
          featureNamesById,
        ),
      [
        combinedSpans,
        displayText,
        featureColors,
        featureNamesById,
        normalizedPlainText,
      ],
    );

    const renderedHitLayers = useMemo(
      () =>
        buildHighlightHitLayers(
          displayText || normalizedPlainText,
          combinedSpans,
          featureColors,
          featureNamesById,
        ),
      [
        combinedSpans,
        displayText,
        featureColors,
        featureNamesById,
        normalizedPlainText,
      ],
    );

    useEffect(() => {
      let isMounted = true;
      const finalize = (
        html: string,
        spans: HighlightSpan[],
        textValue: string,
      ) => {
        if (!isMounted) return;
        setRenderedHtml(html);
        setTeiSpans(spans);
        setDisplayText(textValue);
        setIsReady(true);
      };

      setIsReady(false);

      if (!itemKey || !apiReady || hideFeatureHighlights) {
        finalize(plainHtml, [], normalizedPlainText);
        return () => {
          isMounted = false;
        };
      }

      const cacheKey = itemKey;
      const cachedTei = teiCache.get(cacheKey);
      if (cachedTei) {
        const parsed = parseTeiToSpans(cachedTei, features);
        finalize(
          parsed?.baseHtml || plainHtml,
          parsed?.spans || [],
          parsed?.text || normalizedPlainText,
        );
        return () => {
          isMounted = false;
        };
      }

      const inFlight =
        teiPromiseCache.get(cacheKey) ||
        TeiService.getCollectionsTei({
          id: COLLECTION_ID,
          key: itemKey,
        });
      teiPromiseCache.set(cacheKey, inFlight);

      inFlight
        .then((tei) => {
          if (!tei) {
            finalize(plainHtml, [], normalizedPlainText);
            return;
          }
          teiCache.set(cacheKey, tei);
          const parsed = parseTeiToSpans(tei, features);
          finalize(
            parsed?.baseHtml || plainHtml,
            parsed?.spans || [],
            parsed?.text || normalizedPlainText,
          );
        })
        .catch(() => {
          finalize(plainHtml, [], normalizedPlainText);
        });

      return () => {
        isMounted = false;
      };
    }, [
      itemKey,
      apiReady,
      features,
      featureColors,
      featureNamesById,
      plainHtml,
      normalizedPlainText,
      hideFeatureHighlights,
    ]);

    const handleSelectionUpdate = useCallback(() => {
      if (!editable || !containerRef.current) {
        if (selectionState) {
          setSelectionState(null);
        }
        return;
      }
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        if (selectionState) {
          setSelectionState(null);
        }
        return;
      }
      const range = selection.getRangeAt(0);
      if (range.collapsed) {
        if (selectionState) {
          setSelectionState(null);
        }
        return;
      }
      const container = containerRef.current;
      if (!container.contains(range.commonAncestorContainer)) {
        if (selectionState) {
          setSelectionState(null);
        }
        return;
      }

      const getLayerContainer = (node: Node) => {
        if (node instanceof Element) {
          return node.closest("[data-highlight-layer]");
        }
        return node.parentElement?.closest("[data-highlight-layer]") || null;
      };

      const getOffsetInContainer = (
        layerContainer: Element,
        targetNode: Node,
        offset: number,
      ) => {
        const preRange = document.createRange();
        preRange.selectNodeContents(layerContainer);
        preRange.setEnd(targetNode, offset);
        return preRange.toString().length;
      };

      const startContainer = getLayerContainer(range.startContainer);
      const endContainer = getLayerContainer(range.endContainer);
      if (!startContainer || !endContainer) {
        setSelectionState(null);
        return;
      }

      const start = getOffsetInContainer(
        startContainer,
        range.startContainer,
        range.startOffset,
      );
      const end = getOffsetInContainer(
        endContainer,
        range.endContainer,
        range.endOffset,
      );
      if (start === end) {
        setSelectionState(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const normalizedText = displayText || normalizedPlainText;
      const rawSelectedText = selection.toString();
      const sliceStart = Math.min(start, end);
      const sliceEnd = Math.max(start, end);
      let selectedText = normalizedText.slice(sliceStart, sliceEnd);
      let adjustedStart = sliceStart;
      if (rawSelectedText && selectedText !== rawSelectedText) {
        const searchWindow = 120;
        const windowStart = Math.max(0, sliceStart - searchWindow);
        const windowEnd = Math.min(
          normalizedText.length,
          sliceStart + searchWindow,
        );
        const windowText = normalizedText.slice(windowStart, windowEnd);
        let bestIndex = -1;
        let bestDistance = Number.POSITIVE_INFINITY;
        let matchIndex = windowText.indexOf(rawSelectedText);
        while (matchIndex !== -1) {
          const absoluteIndex = windowStart + matchIndex;
          const distance = Math.abs(absoluteIndex - sliceStart);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = absoluteIndex;
          }
          matchIndex = windowText.indexOf(rawSelectedText, matchIndex + 1);
        }
        if (bestIndex !== -1) {
          adjustedStart = bestIndex;
          selectedText = rawSelectedText;
        }
      }
      if (!selectedText.trim()) {
        setSelectionState(null);
        return;
      }
      setSelectionState({
        start: adjustedStart,
        end: adjustedStart + selectedText.length,
        text: selectedText,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
    }, [displayText, editable, normalizedPlainText, selectionState]);

    const handleAnnotationRequest = () => {
      if (!selectionState || !onRequestAddAnnotation) {
        return;
      }
      onRequestAddAnnotation(selectionState);
      setSelectionState(null);
      window.getSelection()?.removeAllRanges();
    };

    const selectionTooltip =
      editable && selectionState && onRequestAddAnnotation ? (
        <div
          data-highlight-action
          style={{
            position: "fixed",
            left: selectionState.x,
            top: selectionState.y,
            transform: "translate(-50%, -100%)",
            background: "white",
            border: "1px solid #d9d9d9",
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.2)",
            borderRadius: "0.4rem",
            padding: "0.4rem 0.6rem",
            fontSize: "0.8rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            zIndex: 12001,
          }}
        >
          <span>Tag selection as annotation</span>
          <button
            type="button"
            onClick={handleAnnotationRequest}
            style={{
              border: "none",
              background: "#333",
              color: "white",
              padding: "0.25rem 0.5rem",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Tag
          </button>
        </div>
      ) : null;

    if (!isReady) {
      return (
        <div style={{ position: "relative", whiteSpace: "pre-wrap" }}>
          <div
            style={{ position: "relative" }}
            dangerouslySetInnerHTML={{ __html: plainHtml }}
          />
        </div>
      );
    }

    return (
      <div
        style={{ position: "relative", whiteSpace: "pre-wrap" }}
        onMouseMove={(event) => {
          if (
            (event.target as HTMLElement | null)?.closest?.(
              "[data-highlight-action]",
            )
          ) {
            return;
          }
          handleHighlightTooltipMouseMove(event, setTooltipState);
        }}
        onMouseLeave={() => {
          if (!tooltipPinned) {
            handleHighlightTooltipMouseLeave(setTooltipState);
          }
        }}
        onMouseUp={handleSelectionUpdate}
        onKeyUp={handleSelectionUpdate}
        ref={containerRef}
      >
        {renderedLayers.map((layer, index) => (
          <div
            key={index}
            data-highlight-layer={`layer-${index}`}
            style={{
              color: "transparent",
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              userSelect: "none",
              zIndex: editable ? index : index,
            }}
            dangerouslySetInnerHTML={{ __html: layer }}
          />
        ))}
        <div
          data-highlight-layer="base"
          style={{
            position: "relative",
            zIndex: renderedLayers.length,
            pointerEvents:
              editable || renderedLayers.length === 0 ? "auto" : "none",
          }}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
        {editable &&
          renderedHitLayers.map((layer, index) => (
            <div
              key={`hit-${index}`}
              data-highlight-layer={`hit-${index}`}
              style={{
                color: "transparent",
                position: "absolute",
                inset: 0,
                pointerEvents: "auto",
                userSelect: "text",
                zIndex: renderedLayers.length + index + 1,
              }}
              dangerouslySetInnerHTML={{ __html: layer }}
            />
          ))}
        <FeatureHighlightTooltip
          tooltipState={tooltipState}
          onRemove={
            editable && onRemoveHighlight
              ? (state) => {
                  const normalizedText = displayText || normalizedPlainText;
                  const highlightText = normalizedText.slice(
                    state.start,
                    state.end,
                  );
                  onRemoveHighlight({
                    id: state.id,
                    featureKey: state.featureKey,
                    start: state.start,
                    end: state.end,
                    text: highlightText,
                    label: state.label,
                    normalized: state.normalized,
                    color: state.color,
                  });
                  setTooltipState(null);
                }
              : undefined
          }
          onTooltipEnter={editable ? () => setTooltipPinned(true) : undefined}
          onTooltipLeave={editable ? () => setTooltipPinned(false) : undefined}
        />
        {selectionTooltip}
      </div>
    );
  },
);

export default HighlightedText;
