import type { Connect } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import { validateAuthToken } from "./auth";
import { handleNotesRequest, isNotesRequest } from "./handlers/notes";
import {
  handleImageUploadRequest,
  isImageUploadRequest,
} from "./handlers/imageUpload";
import { handleEditionRequest, isEditionRequest } from "./handlers/editions";
import { handleRepoRequest, isRepoRequest } from "./handlers/repo";
import { logInfo, logWarn } from "./logger";

export const router = async (
  req: IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction,
) => {
  logInfo("Incoming request", {
    method: req.method,
    url: req.url,
    userAgent: req.headers["user-agent"],
    timestamp: new Date().toISOString(),
  });
  const authorize = async () => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      logWarn("Authorization failed - missing header", {
        url: req.url,
        method: req.method,
      });
      res.statusCode = 401;
      res.end("Unauthorized: Missing Authorization header");
      return null;
    }
    const user = await validateAuthToken(authHeader);
    if (!user) {
      logWarn("Authorization failed - invalid token", {
        url: req.url,
        method: req.method,
      });
      res.statusCode = 403;
      res.end("Forbidden :(");
    } else {
      logInfo("Authorization successful", {
        user,
        url: req.url,
        method: req.method,
      });
    }
    return user;
  };

  if (isNotesRequest(req)) {
    logInfo("Routing to notes handler", { url: req.url });
    if (!(await authorize())) {
      return;
    }
    await handleNotesRequest(req, res);
  } else if (isImageUploadRequest(req)) {
    logInfo("Routing to image upload handler", { url: req.url });
    if (!(await authorize())) {
      return;
    }
    await handleImageUploadRequest(req, res);
  } else if (isEditionRequest(req)) {
    logInfo("Routing to edition handler", { url: req.url });
    const user = await authorize();
    if (!user) {
      return;
    }
    await handleEditionRequest(user, req, res);
  } else if (isRepoRequest(req)) {
    logInfo("Routing to repo handler", { url: req.url });
    if (!(await authorize())) {
      return;
    }
    await handleRepoRequest(req, res);
  } else {
    next();
  }
};
