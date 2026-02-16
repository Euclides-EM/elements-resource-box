import { OpenAPI } from "../../hub-api";

export const configureHubApi = (authToken: string | null) => {
  OpenAPI.TOKEN = authToken ?? "";
};
