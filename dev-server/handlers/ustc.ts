import type { IncomingMessage, ServerResponse } from "http";
import { ustcLookup } from "../../scripts/ustc_lookup";
import { logError, logInfo } from "../logger";
import { USTC_LOOKUP_API_PATH } from "../../common/api";

export const isUstcRequest = (req: IncomingMessage) => {
  return req.url?.startsWith(USTC_LOOKUP_API_PATH);
};

export const handleUstcRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const urlParts = req.url?.split("/");
  const ustcIdString = urlParts?.[3];

  if (!ustcIdString) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "USTC ID is required" }));
    return;
  }

  const ustcId = parseInt(ustcIdString);

  if (isNaN(ustcId)) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Invalid USTC ID format" }));
    return;
  }

  try {
    logInfo("USTC lookup request", { ustcId });

    const result = await ustcLookup(ustcId);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");

    if (result) {
      logInfo("USTC lookup successful", { ustcId });
      res.end(JSON.stringify(result));
    } else {
      logInfo("USTC edition not found", { ustcId });
      res.end(JSON.stringify({}));
    }
  } catch (error) {
    logError("USTC lookup error", { ustcId, error });
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({}));
  }
};
