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

export const router = async (
  req: IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction,
) => {
  const authorize = async () => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      res.statusCode = 401;
      res.end("Unauthorized: Missing Authorization header");
      return null;
    }
    const user = await validateAuthToken(authHeader);
    if (!user) {
      res.statusCode = 403;
      res.end("Forbidden :(");
    }
    return user;
  };

  if (isNotesRequest(req)) {
    if (!(await authorize())) {
      return;
    }
    await handleNotesRequest(req, res);
  } else if (isImageUploadRequest(req)) {
    if (!(await authorize())) {
      return;
    }
    await handleImageUploadRequest(req, res);
  } else if (isEditionRequest(req)) {
    const user = await authorize();
    if (!user) {
      return;
    }
    await handleEditionRequest(user, req, res);
  } else if (isRepoRequest(req)) {
    if (!(await authorize())) {
      return;
    }
    await handleRepoRequest(req, res);
  } else {
    next();
  }
};
