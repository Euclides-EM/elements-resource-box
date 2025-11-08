import { Link, useLocation } from "react-router-dom";
import styled from "@emotion/styled";
import { FaExternalLinkAlt } from "react-icons/fa";
import { css } from "@emotion/react";
import {
  CATALOGUE_ROUTE,
  HOME_ROUTE,
  MAP_ROUTE,
  TITLE_PAGES_ROUTE,
  TRENDS_ROUTE,
} from "./routes.ts";
import { MACTUTOR_URL } from "../../constants";
import { useState } from "react";
import { AddEditionModal } from "../tps/modal/AddEditionModal.tsx";
import { ActionsMenu } from "./ActionsMenu.tsx";

const StyledNavItem = styled.li<{ active: boolean; mobile: boolean }>`
  a {
    text-decoration: none;
    color: ${({ active }) => (active ? "#ffffff" : "#aaaaaa")};
    font-weight: ${({ active }) => (active ? "bold" : "normal")};
    font-size: 1.2rem;
    transition: color 0.3s ease;
    display: block;

    &:hover {
      color: white;
    }
  }

  ${({ mobile }) =>
    mobile &&
    css`
      a {
        padding: 0.5rem 0;
        font-size: 1rem;
      }
    `};
`;

const StyledExternalIcon = styled(FaExternalLinkAlt)`
  font-size: 0.8rem;
  margin-left: 0.5rem;
`;

const DevNavItem = styled.li<{ mobile: boolean }>`
  ${({ mobile }) =>
    mobile &&
    css`
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #555;
    `};
`;

interface NavItemProps {
  to: string;
  active: boolean;
  external?: boolean;
  children: React.ReactNode;
  className?: string;
  mobile: boolean;
}

function NavItem({
  to,
  active,
  external = false,
  children,
  className,
  mobile,
}: NavItemProps) {
  if (external) {
    return (
      <StyledNavItem active={active} className={className} mobile={mobile}>
        <Link to={to} target="_blank" rel="noreferrer noopener">
          {children} <StyledExternalIcon />
        </Link>
      </StyledNavItem>
    );
  }

  return (
    <StyledNavItem active={active} className={className} mobile={mobile}>
      <Link to={to}>{children}</Link>
    </StyledNavItem>
  );
}

const NavList = styled.ul<{ mobile: boolean }>`
  list-style: none;
  margin: 0;
  padding: 0;
  ${({ mobile }) =>
    !mobile &&
    css`
      display: flex;
      gap: 2rem;
    `};
`;

export const NavItems = ({ mobile }: { mobile: boolean }) => {
  const location = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
      <NavList mobile={mobile}>
        <NavItem
          to={HOME_ROUTE}
          active={location.pathname === HOME_ROUTE}
          mobile={mobile}
        >
          Home
        </NavItem>
        <NavItem
          to={CATALOGUE_ROUTE}
          active={location.pathname === CATALOGUE_ROUTE}
          mobile={mobile}
        >
          Catalogue
        </NavItem>
        <NavItem
          to={TITLE_PAGES_ROUTE}
          active={location.pathname === TITLE_PAGES_ROUTE}
          mobile={mobile}
        >
          Editions Gallery
        </NavItem>
        <NavItem
          to={TRENDS_ROUTE}
          active={location.pathname === TRENDS_ROUTE}
          mobile={mobile}
        >
          Explorer
        </NavItem>
        <NavItem
          to={MAP_ROUTE}
          active={location.pathname === MAP_ROUTE}
          mobile={mobile}
        >
          Map
        </NavItem>
        <NavItem to={MACTUTOR_URL} active={false} external mobile={mobile}>
          MacTutor Index Graph
        </NavItem>
        {import.meta.env.DEV && (
          <DevNavItem mobile={mobile}>
            <ActionsMenu
              mobile={mobile}
              onShowCreateModal={() => setShowCreateModal(true)}
            />
          </DevNavItem>
        )}
      </NavList>
      {showCreateModal && (
        <AddEditionModal onClose={() => setShowCreateModal(false)} />
      )}
    </>
  );
};
