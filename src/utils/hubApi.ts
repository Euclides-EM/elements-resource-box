import { OpenAPI } from "../../common/hub-api";

export const COLLECTION_ID = "tps";
const HUB_API_BASE = "http://localhost:8086/api/v1";

export const configureHubApi = (authToken: string | null) => {
  OpenAPI.BASE = HUB_API_BASE;
  OpenAPI.TOKEN = authToken ?? "";
};
