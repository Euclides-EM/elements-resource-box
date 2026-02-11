import { Feature } from "../../../types";
import { useEffect, useMemo, useState, memo } from "react";
import { TeiService } from "../../../../common/hub-api";
import { COLLECTION_ID } from "../../../utils/hubApi";
import FeatureHighlightTooltip from "./FeatureHighlightTooltip";
import {
  handleHighlightTooltipMouseLeave,
  handleHighlightTooltipMouseMove,
  HighlightTooltipState,
} from "./highlightTooltipUtils";

type HighlightedTextProps = {
  text: string;
  features: Feature[];
  featureColors?: Record<string, string>;
  featureNamesById?: Record<string, string>;
  itemKey?: string;
  apiReady?: boolean;
  showFeatureHighlights?: boolean;
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

const parseTeiToLayers = (
  tei: string,
  selectedFeatures: Feature[],
  featureColors: Record<string, string> | undefined,
  featureNamesById: Record<string, string> | undefined,
): { baseHtml: string; layers: string[] } | null => {
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

  const layers = adjustedSpans
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

      const before = trimmedText.slice(0, span.start);
      const segment = trimmedText.slice(span.start, span.end);
      const after = trimmedText.slice(span.end);
      let html =
        wrapNonInteractive(escapeHtml(before)) +
        `<span style="${style}" data-feature-label="${tooltip}" data-feature-color="${tooltipColor}"${tooltipNormalizedAttr}>${escapeHtml(segment)}</span>` +
        wrapNonInteractive(escapeHtml(after));
      html = html.replaceAll("\n", "<br/>");
      html = html.replace(/^(?:<br\/>|\s)+/, "");
      html = html.replace(/(?:<br\/>|\s)+$/, "");
      return html;
    })
    .filter(Boolean);

  return { baseHtml, layers };
};

const HighlightedText = memo(
  ({
    text,
    features,
    featureColors,
    featureNamesById,
    itemKey,
    apiReady,
    showFeatureHighlights = true,
  }: HighlightedTextProps) => {
    const [renderedHtml, setRenderedHtml] = useState<string>("");
    const [renderedLayers, setRenderedLayers] = useState<string[]>([]);
    const [isReady, setIsReady] = useState(false);
    const [tooltipState, setTooltipState] =
      useState<HighlightTooltipState | null>(null);

    const plainHtml = useMemo(() => buildTextHtml(text), [text]);

    useEffect(() => {
      let isMounted = true;
      const finalize = (html: string, layers: string[] = []) => {
        if (!isMounted) return;
        setRenderedHtml(html);
        setRenderedLayers(layers);
        setIsReady(true);
      };

      setIsReady(false);

      if (!itemKey || !apiReady || !showFeatureHighlights) {
        finalize(plainHtml);
        return () => {
          isMounted = false;
        };
      }

      const cacheKey = itemKey;
      const cachedTei = teiCache.get(cacheKey);
      if (cachedTei) {
        const parsed = parseTeiToLayers(
          cachedTei,
          features,
          featureColors,
          featureNamesById,
        );
        finalize(parsed?.baseHtml || plainHtml, parsed?.layers || []);
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
            finalize(plainHtml);
            return;
          }
          teiCache.set(cacheKey, tei);
          const parsed = parseTeiToLayers(
            tei,
            features,
            featureColors,
            featureNamesById,
          );
          finalize(parsed?.baseHtml || plainHtml, parsed?.layers || []);
        })
        .catch(() => {
          finalize(plainHtml);
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
      showFeatureHighlights,
    ]);

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
        onMouseMove={(event) =>
          handleHighlightTooltipMouseMove(event, setTooltipState)
        }
        onMouseLeave={() => handleHighlightTooltipMouseLeave(setTooltipState)}
      >
        {renderedLayers.map((layer, index) => (
          <div
            key={index}
            style={{
              color: "transparent",
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: index,
            }}
            dangerouslySetInnerHTML={{ __html: layer }}
          />
        ))}
        <div
          style={{
            position: "relative",
            zIndex: renderedLayers.length,
            pointerEvents: renderedLayers.length > 0 ? "none" : "auto",
          }}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
        <FeatureHighlightTooltip tooltipState={tooltipState} />
      </div>
    );
  },
);

export default HighlightedText;
