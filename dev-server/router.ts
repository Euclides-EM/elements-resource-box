import type { Connect } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import { validateAuthToken } from "./auth";
import { handleNotesRequest, isNotesRequest } from "./handlers/notes";
import {
  handleImageUploadRequest,
  isImageUploadRequest,
} from "./handlers/imageUpload";
import { handleEditionRequest, isEditionRequest } from "./handlers/editions";

export const router = async (
  req: IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    res.statusCode = 401;
    res.end("Unauthorized: Missing Authorization header");
    return;
  }
  const user = await validateAuthToken(authHeader);
  if (!user) {
    res.statusCode = 403;
    res.end("Forbidden :(");
    return;
  }
  if (isNotesRequest(req)) {
    await handleNotesRequest(req, res);
  } else if (isImageUploadRequest(req)) {
    await handleImageUploadRequest(req, res);
  } else if (isEditionRequest(req)) {
    await handleEditionRequest(user, req, res);
  } else {
    next();
  }
};
