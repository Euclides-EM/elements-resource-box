import { Outlet } from "react-router-dom";
import Navigation from "./Navigation";
import styled from "@emotion/styled";
import { FilterPane } from "../map/FilterPane";
import { MAIN_CONTENT_ID, NAVBAR_HEIGHT } from "./routes.ts";

const LayoutContainer = styled.div`
  height: 100vh;
  width: 100vw;
`;

const ContentRow = styled.div`
  display: flex;
  height: calc(100vh - ${NAVBAR_HEIGHT}px);
`;

const MainContent = styled.main`
  flex: 1;
  min-width: 0;
  overflow-y: auto;

  div {
    overscroll-behavior-y: auto;
  }
`;

function Layout() {
  return (
    <LayoutContainer>
      <Navigation />
      <ContentRow>
        <FilterPane />
        <MainContent id={MAIN_CONTENT_ID}>
          <Outlet />
        </MainContent>
      </ContentRow>
    </LayoutContainer>
  );
}

export default Layout;
