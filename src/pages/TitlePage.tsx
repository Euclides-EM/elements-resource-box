import {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
  useContext,
} from "react";
import useLocalStorageState from "use-local-storage-state";
import { Mode } from "../types";
import {
  Column,
  Container,
  ResetButton,
  Row,
  ScrollToTopButton,
  Text,
} from "../components/common";
import { TILE_HEIGHT, TILE_WIDTH } from "../constants";
import MultiSelect from "../components/tps/filters/MultiSelect";
import Radio from "../components/tps/filters/Radio";
import ItemView from "../components/tps/features/ItemView";
import { useAppliedFilter } from "../contexts/FilterAppliedContext";
import { IoWarning } from "react-icons/io5";
import styled from "@emotion/styled";
import Switch from "react-switch";
import { LAND_COLOR, MARKER_3 } from "../utils/colors.ts";
import { Stats } from "../components/Stats.tsx";
import { inEuclidesMode } from "../utils/mode.ts";
import { AuthContext } from "../contexts/Auth";
import { COLLECTION_ID, configureHubApi } from "../utils/hubApi";
import { FeaturesService, featureplat_Feature } from "../../common/hub-api";

const NoteLine = styled(Row)`
  opacity: 0.8;
`;

const SearchInput = styled.input`
  padding: 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid #ccc;
  width: 100%;
  font-size: 1rem;
`;

function TitlePage() {
  const { filteredItems } = useAppliedFilter();
  const { token } = useContext(AuthContext);

  const [titlePagesModeOn, setTitlePagesModeOn] = useLocalStorageState<boolean>(
    "tp-on",
    {
      defaultValue: false,
    },
  );
  const [mode, setMode] = useLocalStorageState<Mode>("tp-mode", {
    defaultValue: "images",
  });
  const [availableFeatures, setAvailableFeatures] = useState<
    featureplat_Feature[]
  >([]);
  const [featureColors, setFeatureColors] = useState<Record<string, string>>(
    {},
  );
  const [featureTooltips, setFeatureTooltips] = useState<
    Record<string, string>
  >({});
  const [defaultFeatureIds, setDefaultFeatureIds] = useState<string[]>([]);
  const [features, setFeatures] = useLocalStorageState<string[]>(
    "tp-features",
    {
      defaultValue: [],
    },
  );
  const [searchText, setSearchText] = useLocalStorageState<string>(
    "tps-search",
    { defaultValue: "" },
  );
  const [showScrollTop, setShowScrollTop] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [apiReady, setApiReady] = useState(false);
  const [featuresLoaded, setFeaturesLoaded] = useState(false);

  const featureNameCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableFeatures.forEach((feature) => {
      if (feature.name) {
        counts[feature.name] = (counts[feature.name] || 0) + 1;
      }
    });
    return counts;
  }, [availableFeatures]);

  const featureNameById = useMemo(() => {
    const map: Record<string, string> = {};
    availableFeatures.forEach((feature) => {
      if (feature.id && feature.name) {
        map[feature.id] = feature.name;
      }
    });
    return map;
  }, [availableFeatures]);

  const sortedFeatureIds = useMemo(() => {
    return availableFeatures
      .filter((feature) => feature.id && feature.name)
      .slice()
      .sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        }),
      )
      .map((feature) => feature.id as string);
  }, [availableFeatures]);

  const sortFeatureIds = useCallback(
    (ids: string[]) =>
      [...ids].sort((a, b) =>
        (featureNameById[a] || "").localeCompare(
          featureNameById[b] || "",
          undefined,
          { sensitivity: "base" },
        ),
      ),
    [featureNameById],
  );

  const selectedFeatureIds = useMemo(() => {
    return Array.from(new Set(features));
  }, [features]);

  const featureColorsById = useMemo(() => {
    const map: Record<string, string> = {};
    availableFeatures.forEach((feature) => {
      if (feature.id && feature.color && !map[feature.id]) {
        map[feature.id] = feature.color;
      }
    });
    return map;
  }, [availableFeatures]);

  useEffect(() => {
    if (!titlePagesModeOn && mode === "texts") {
      setMode("images");
    }
  }, [mode, setMode, titlePagesModeOn]);

  useEffect(() => {
    configureHubApi(token);
    setApiReady(true);
  }, [token]);

  useEffect(() => {
    const loadFeatures = async () => {
      if (!apiReady || featuresLoaded) {
        return;
      }
      try {
        const response = await FeaturesService.getCollectionsFeatures({
          collectionId: COLLECTION_ID,
        });
        const sortedFeatures = (response ?? [])
          .filter((feature) => feature.id && feature.name)
          .slice()
          .sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", undefined, {
              sensitivity: "base",
            }),
          );
        const nameById: Record<string, string> = {};
        sortedFeatures.forEach((feature) => {
          if (feature.id && feature.name) {
            nameById[feature.id] = feature.name;
          }
        });
        const sortIdsByName = (ids: string[]) =>
          [...ids].sort((a, b) =>
            (nameById[a] || "").localeCompare(nameById[b] || "", undefined, {
              sensitivity: "base",
            }),
          );
        const defaultIds = sortedFeatures
          .filter((feature) => feature.is_default)
          .map((feature) => feature.id as string);
        const colorMap: Record<string, string> = {};
        const tooltipMap: Record<string, string> = {};
        (response ?? []).forEach((feature: featureplat_Feature) => {
          if (!feature.id) {
            return;
          }
          if (feature.color) {
            colorMap[feature.id] = feature.color;
          }
          if (feature.description) {
            tooltipMap[feature.id] = feature.description;
          }
        });
        setFeatureColors(colorMap);
        setFeatureTooltips(tooltipMap);
        setDefaultFeatureIds(sortIdsByName(defaultIds));
        setAvailableFeatures(sortedFeatures);
        if (sortedFeatures.length > 0) {
          setFeatures((prev) => {
            const normalized = prev
              .map((value) => {
                if (sortedFeatures.some((f) => f.id === value)) {
                  return value;
                }
                const matching = sortedFeatures.filter(
                  (feature) => feature.name === value,
                );
                if (matching.length === 1) {
                  return matching[0].id as string;
                }
                return null;
              })
              .filter((value): value is string => Boolean(value));
            if (normalized.length > 0) {
              return sortIdsByName(normalized);
            }
            if (defaultIds.length > 0) {
              return sortIdsByName(defaultIds);
            }
            return sortIdsByName(
              sortedFeatures.map((feature) => feature.id as string),
            );
          });
        }
      } finally {
        setFeaturesLoaded(true);
      }
    };
    void loadFeatures();
  }, [apiReady, featuresLoaded, setFeatures]);

  const handleScroll = useCallback(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    setShowScrollTop(scrollTop > 200);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const filteredBySearchItems = useMemo(() => {
    if (!searchText.trim() || !titlePagesModeOn) {
      return filteredItems;
    }

    const searchLower = searchText.toLowerCase();
    return filteredItems?.filter((item) => {
      const title = item.title?.toLowerCase() || "";
      const imprint = item.imprint?.toLowerCase() || "";
      const titleEn = item.titleEn?.toLowerCase() || "";
      return (
        title
          .replaceAll("\n", " ")
          .replaceAll("  ", " ")
          .replaceAll("-", "")
          .includes(searchLower) ||
        titleEn
          .replaceAll("\n", " ")
          .replaceAll("  ", " ")
          .replaceAll("-", "")
          .includes(searchLower) ||
        imprint
          .replaceAll("\n", " ")
          .replaceAll("  ", " ")
          .replaceAll("-", "")
          .includes(searchLower) ||
        item.authors?.some((author) =>
          author.toLowerCase().includes(searchLower),
        ) ||
        item.cities.some((city) => city.toLowerCase().includes(searchLower)) ||
        item.languages.some((lang) =>
          lang.toLowerCase().includes(searchLower),
        ) ||
        item.year?.toLowerCase().includes(searchLower)
      );
    });
  }, [filteredItems, searchText, titlePagesModeOn]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        if (titlePagesModeOn && mode === "texts" && searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    },
    [titlePagesModeOn, mode],
  );

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleScroll, handleKeyDown]);

  return (
    <Container
      style={{
        position: "relative",
        margin: "2rem 0",
        minHeight: "calc(100vh - 6rem)",
      }}
    >
      {showScrollTop && (
        <ScrollToTopButton onClick={scrollToTop} title="Scroll to top">
          ↑
        </ScrollToTopButton>
      )}
      <Column minWidth="min(820px, 90%)">
        <Stats />
        {!inEuclidesMode() && (
          <>
            <Row gap={0.5}>
              Title Pages Experiment View{" "}
              <Switch
                onColor={MARKER_3}
                activeBoxShadow={`0 0 2px 3px ${MARKER_3}`}
                onChange={() =>
                  setTitlePagesModeOn((b) => {
                    if (b) {
                      setMode("texts");
                    }
                    return !b;
                  })
                }
                checked={titlePagesModeOn}
              />
            </Row>
            {titlePagesModeOn && (
              <>
                <Radio
                  name="Show"
                  options={["Texts", "Images"]}
                  value={mode === "images"}
                  onChange={(b) => setMode(b ? "images" : "texts")}
                />
                <Row justifyStart noWrap>
                  <Column alignItems="end">
                    <span>Highlight Segments:</span>
                  </Column>
                  <MultiSelect
                    name="Features"
                    value={features}
                    options={sortedFeatureIds}
                    labelFn={(featureId) => {
                      const name = featureNameById[featureId] || featureId;
                      if ((featureNameCounts[name] || 0) > 1) {
                        return `${name} (${featureId.slice(0, 6)})`;
                      }
                      return name;
                    }}
                    onChange={(f) => setFeatures(sortFeatureIds(f as string[]))}
                    colors={featureColors}
                    tooltips={featureTooltips}
                    className="features-multi-select"
                  />
                  <ResetButton
                    onClick={() =>
                      setFeatures(
                        sortFeatureIds(
                          defaultFeatureIds.length > 0
                            ? defaultFeatureIds
                            : sortedFeatureIds,
                        ),
                      )
                    }
                  >
                    Reset
                  </ResetButton>
                </Row>
                <NoteLine gap={0.5} noWrap noWrapAlsoOnMobile>
                  <IoWarning /> Highlighted features were partially identified
                  using an LLM and may not be accurate.
                </NoteLine>
              </>
            )}
          </>
        )}

        <Row>
          <SearchInput
            ref={searchInputRef}
            type="text"
            placeholder="Search in title pages..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Row>
      </Column>
      <Row rowGap={6}>
        {filteredBySearchItems == null ||
        (filteredBySearchItems?.length || 0) > 0 ? (
          filteredBySearchItems
            ?.sort((a, b) => {
              if (!a.year) return 1;
              if (!b.year) return -1;
              return a.year.localeCompare(b.year);
            })
            .map((item) => (
              <ItemView
                key={item.key}
                height={TILE_HEIGHT}
                width={TILE_WIDTH}
                item={item}
                mode={mode}
                features={titlePagesModeOn ? selectedFeatureIds : null}
                featureColors={featureColorsById}
                apiReady={apiReady}
              />
            ))
        ) : (
          <Text size={1.5} color={LAND_COLOR}>
            No matches. Try adjusting the filters or search.
          </Text>
        )}
      </Row>
      <Text size={1} style={{ marginTop: "auto" }}>
        À la Croisée des Hyperliens, chez le scribe fatigué et son félin
        passivement investi, MMXXV.
      </Text>
      <div />
    </Container>
  );
}

export default TitlePage;
