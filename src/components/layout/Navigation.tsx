import { useLocation, useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import {
  HOME_ROUTE,
  ITEM_EDIT_ROUTE,
  NAVBAR_HEIGHT,
  PRESENTATION_ROUTE,
} from "./routes.ts";
import { MARKER_5 } from "../../utils/colors.ts";
import { useLayoutEffect } from "react";
import { BsBoundingBoxCircles } from "react-icons/bs";
import { FilterButton } from "./FilterButton";
import MobileNavigation from "./MobileNavigation";
import { NavItems } from "./NavItem";
import { useIsMobile } from "./isMobile.ts";

const Placeholder = styled.div`
  height: ${NAVBAR_HEIGHT}px;
`;

const NavContainer = styled.nav`
  position: fixed;
  display: flex;
  width: 100vw;
  padding: 1rem;
  height: calc(${NAVBAR_HEIGHT}px - 2rem);
  background-color: black;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 1001;
`;

const NavContent = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
`;

const VerticalLine = styled.div`
  width: 1px;
  height: 20px;
  background-color: #aaaaaa;
  margin: 0 2rem;
`;

const SiteTitle = styled.div`
  color: ${MARKER_5};
  white-space: nowrap;
  cursor: pointer;
`;

const StyledBoxIcon = styled(BsBoundingBoxCircles)`
  margin-left: 0.5rem;
  color: ${MARKER_5};
  cursor: pointer;
`;

const FixedFilterButtonContainer = styled.div`
  position: fixed;
  top: calc(${NAVBAR_HEIGHT}px + 1rem);
  left: 1rem;
  z-index: 90;
`;

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const noFilterRoutes = [HOME_ROUTE, PRESENTATION_ROUTE, ITEM_EDIT_ROUTE];

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (isMobile) {
    return (
      <>
        <MobileNavigation />
        <Placeholder />
        {!noFilterRoutes.includes(location.pathname) && (
          <FixedFilterButtonContainer>
            <FilterButton />
          </FixedFilterButtonContainer>
        )}
      </>
    );
  }

  return (
    <>
      <NavContainer>
        <NavContent>
          <SiteTitle onClick={() => navigate(HOME_ROUTE)}>
            Euclid's Elements: A Resource Box
          </SiteTitle>
          <StyledBoxIcon onClick={() => navigate(HOME_ROUTE)} />
          <VerticalLine />
          <NavItems mobile={false} />
        </NavContent>
      </NavContainer>
      <Placeholder />
      {!noFilterRoutes.includes(location.pathname) && (
        <FixedFilterButtonContainer>
          <FilterButton />
        </FixedFilterButtonContainer>
      )}
    </>
  );
}

export default Navigation;
