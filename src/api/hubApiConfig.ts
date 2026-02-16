import { OpenAPI } from "../../hub-api";

export const configureHubApi = (authToken: string | null) => {
  OpenAPI.BASE = `${import.meta.env.VITE_HUB_SERVER_URL}/api/v1`;
  OpenAPI.TOKEN = authToken ?? "";
};
