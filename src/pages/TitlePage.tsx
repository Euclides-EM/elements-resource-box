import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import useLocalStorageState from "use-local-storage-state";
import { Feature, Mode } from "../types";
import {
  Column,
  Container,
  ResetButton,
  Row,
  ScrollToTopButton,
  Text,
} from "../components/common";
import {
  FeaturesNotSelectedByDefault,
  FeatureToColor,
  FeatureToColumnName,
  FeatureToTooltip,
  TILE_HEIGHT,
  TILE_WIDTH,
} from "../constants";
import MultiSelect from "../components/tps/filters/MultiSelect";
import Radio from "../components/tps/filters/Radio";
import ItemView from "../components/tps/features/ItemView";
import { useFilter } from "../contexts/FilterContext";
import { IoWarning } from "react-icons/io5";
import styled from "@emotion/styled";
import Switch from "react-switch";
import { LAND_COLOR, MARKER_3 } from "../utils/colors.ts";
import { Stats } from "../components/Stats.tsx";

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
  const { filteredItems } = useFilter();

  const [titlePagesModeOn, setTitlePagesModeOn] = useLocalStorageState<boolean>(
    "tp-on",
    {
      defaultValue: false,
    },
  );
  const [mode, setMode] = useLocalStorageState<Mode>("tp-mode", {
    defaultValue: "images",
  });
  const [features, setFeatures] = useLocalStorageState<Feature[]>(
    "tp-features",
    {
      defaultValue: Object.keys(FeatureToColumnName).sort() as Feature[],
    },
  );
  const [searchText, setSearchText] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!titlePagesModeOn && mode === "texts") {
      setMode("images");
    }
  }, [mode, setMode, titlePagesModeOn]);

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
    return filteredItems.filter((item) => {
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
                options={Object.keys(FeatureToColumnName).sort()}
                onChange={(f) => setFeatures((f as Feature[]).sort())}
                colors={FeatureToColor}
                tooltips={FeatureToTooltip}
                className="features-multi-select"
              />
              <ResetButton
                onClick={() =>
                  setFeatures(
                    Object.keys(FeatureToColumnName)
                      .filter(
                        (f) =>
                          !FeaturesNotSelectedByDefault.includes(f as Feature),
                      )
                      .sort() as Feature[],
                  )
                }
              >
                Reset
              </ResetButton>
            </Row>
            <Row>
              <SearchInput
                ref={searchInputRef}
                type="text"
                placeholder="Search in title pages..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Row>
            <NoteLine gap={0.5} noWrap noWrapAlsoOnMobile>
              <IoWarning /> Highlighted features were partially identified using
              an LLM and may not be accurate.
            </NoteLine>
          </>
        )}
      </Column>
      <Row rowGap={6}>
        {(filteredBySearchItems?.length || 0) > 0 ? (
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
                features={titlePagesModeOn ? features : null}
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
