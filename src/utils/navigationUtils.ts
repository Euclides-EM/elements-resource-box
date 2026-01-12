import { useLocation, useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { NO_FILTER_ROUTES } from "../components/layout/routes";

export const preserveQueryParams = (
  path: string,
  currentSearch: string,
): string => {
  // Don't preserve query params when navigating to a no-filter route
  if (NO_FILTER_ROUTES.includes(path)) {
    return path;
  }

  if (currentSearch && !path.includes("?")) {
    return `${path}${currentSearch}`;
  }
  return path;
};

export const useNavigateWithQuery = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (path: string) => {
      const pathWithQuery = preserveQueryParams(path, location.search);
      navigate(pathWithQuery);
    },
    [navigate, location.search],
  );
};
