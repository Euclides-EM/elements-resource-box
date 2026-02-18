import { OpenAPI } from "../../hub-api";

const HUB_API_BASE = "http://localhost:8086/api/v1";

let hubConfigured = false;

OpenAPI.HEADERS = async () => {
  if (!hubConfigured) {
    throw new Error("Hub API not configured.");
  }
  return {};
};

export const configureHubApi = (authToken: string | null) => {
  OpenAPI.BASE = HUB_API_BASE;
  OpenAPI.TOKEN = authToken ?? "";
  hubConfigured = true;
};
