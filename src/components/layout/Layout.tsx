import { Outlet, useLocation } from "react-router-dom";
import Navigation from "./Navigation";
import styled from "@emotion/styled";
import { FilterPane } from "../map/FilterPane";
import { MAIN_CONTENT_ID, MAP_ROUTE, NAVBAR_HEIGHT } from "./routes.ts";
import { useEditFilter } from "../../contexts/FilterEditContext";

const LayoutContainer = styled.div`
  height: 100vh;
  width: 100vw;
`;

const ContentRow = styled.div<{ $overlayFilters: boolean }>`
  display: flex;
  position: relative;
  height: calc(100vh - ${NAVBAR_HEIGHT}px);
  overflow: ${({ $overlayFilters }) =>
    $overlayFilters ? "hidden" : "visible"};
`;

const MainContent = styled.main<{ $overlayFilters: boolean }>`
  flex: 1;
  width: ${({ $overlayFilters }) => ($overlayFilters ? "100%" : "auto")};
  min-width: 0;
  overflow-y: auto;

  div {
    overscroll-behavior-y: auto;
  }
`;

const FilterPaneSlot = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  z-index: 2;
`;

function Layout() {
  const { filterOpen, setFilterOpen } = useEditFilter();
  const location = useLocation();
  const overlayFilters = location.pathname === MAP_ROUTE;

  return (
    <LayoutContainer>
      <Navigation />
      <ContentRow $overlayFilters={overlayFilters}>
        {overlayFilters ? (
          <FilterPaneSlot>
            <FilterPane />
          </FilterPaneSlot>
        ) : (
          <FilterPane />
        )}
        <MainContent
          id={MAIN_CONTENT_ID}
          $overlayFilters={overlayFilters}
          onClick={() => filterOpen && setFilterOpen(false)}
        >
          <Outlet />
        </MainContent>
      </ContentRow>
    </LayoutContainer>
  );
}

export default Layout;
