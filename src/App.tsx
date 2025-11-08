import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Route,
  createRoutesFromElements,
} from "react-router-dom";
import Home from "./pages/Home";
import TitlePage from "./pages/TitlePage";
import Layout from "./components/layout/Layout";
import { TourProvider } from "@reactour/tour";
import { tourSteps } from "./components/map/Tour.tsx";
import { PANE_COLOR_ALT } from "./utils/colors.ts";
import Map from "./pages/Map.tsx";
import {
  HOME_ROUTE,
  MAP_ROUTE,
  TITLE_PAGES_ROUTE,
  CATALOGUE_ROUTE,
  TRENDS_ROUTE,
  PRESENTATION_ROUTE,
  DIAGRAMS_ROUTE,
} from "./components/layout/routes.ts";
import Catalogue from "./pages/Catalogue.tsx";
import Trends from "./pages/Trends.tsx";
import Presentation from "./pages/Presentation.tsx";
import Diagrams from "./pages/Diagrams.tsx";
import { useLocalStorage } from "usehooks-ts";
import { AuthContext } from "./contexts/Auth.ts";

function App() {
  const [authToken, setAuthToken] = useLocalStorage<string | null>(
    "resource-box-auth",
    null,
  );

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route element={<Layout />}>
        <Route path={HOME_ROUTE} element={<Home />} />
        <Route path={TITLE_PAGES_ROUTE} element={<TitlePage />} />
        <Route path={CATALOGUE_ROUTE} element={<Catalogue />} />
        <Route path={TRENDS_ROUTE} element={<Trends />} />
        <Route path={PRESENTATION_ROUTE} element={<Presentation />} />
        <Route path={DIAGRAMS_ROUTE} element={<Diagrams />} />
        <Route
          path={MAP_ROUTE}
          element={
            <TourProvider
              steps={tourSteps}
              styles={{
                maskArea: (base) => ({ ...base, rx: 8 }),
                popover: (base) => ({
                  ...base,
                  "--reactour-accent": PANE_COLOR_ALT,
                  borderRadius: "0.5rem",
                }),
              }}
            >
              <Map />
            </TourProvider>
          }
        />
        <Route path="*" element={<Navigate replace to={HOME_ROUTE} />} />
      </Route>,
    ),
  );

  return (
    <AuthContext.Provider
      value={{
        token: authToken,
        setToken: setAuthToken,
      }}
    >
      <RouterProvider router={router} />
    </AuthContext.Provider>
  );
}

export default App;
