import type { IncomingMessage, ServerResponse } from "http";
import fs from "fs";
import path from "path";
import {
  parseMultipartFormData,
  sendJsonResponse,
  sendErrorResponse,
} from "../util-request";
import { IMAGE_UPLOAD_API_PATH } from "../../common/api";
import { logInfo, logWarn, logError } from "../logger";

const saveImageFile = (imageData: Buffer, filename: string): void => {
  logInfo("Starting image file save", { filename, fileSize: imageData.length });

  const publicDir = path.resolve("public/tps");
  if (!fs.existsSync(publicDir)) {
    logInfo("Creating directory for images", { publicDir });
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const filePath = path.join(publicDir, filename);
  logInfo("Writing image file", { filePath, fileSize: imageData.length });

  fs.writeFileSync(filePath, imageData);

  logInfo("Image file saved successfully", { filename, filePath });
};

export const isImageUploadRequest = (req: IncomingMessage): boolean => {
  return req.method === "POST" && req.url === IMAGE_UPLOAD_API_PATH;
};

export const handleImageUploadRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  const startTime = Date.now();
  logInfo("Processing image upload request", { url: req.url, method: req.method });

  try {
    const { fields, files } = await parseMultipartFormData(req);
    logInfo("Parsed multipart form data", {
      fieldKeys: Object.keys(fields),
      fileKeys: Object.keys(files)
    });

    const key = fields.key;
    if (!key) {
      logWarn("Missing key field in image upload", { availableFields: Object.keys(fields) });
      sendErrorResponse(res, 400, "Key is required for image upload");
      return;
    }

    const type = fields.type;
    if (!type) {
      logWarn("Missing type field in image upload", { key, availableFields: Object.keys(fields) });
      sendErrorResponse(res, 400, "Type is required for image upload");
      return;
    }

    if (!files.file) {
      logWarn("No file provided in upload", { key, type, availableFiles: Object.keys(files) });
      sendErrorResponse(res, 400, "No file provided");
      return;
    }

    const fileExtension =
      files.file.name.split(".").pop()?.toLowerCase() || "png";
    const filename = `${key}_${type}.${fileExtension}`;

    logInfo("Processing file upload", {
      key,
      type,
      originalFilename: files.file.name,
      generatedFilename: filename,
      fileSize: files.file.data.length,
      fileExtension
    });

    saveImageFile(files.file.data, filename);

    const duration = Date.now() - startTime;
    logInfo("Image upload completed successfully", {
      key,
      type,
      filename,
      duration: `${duration}ms`,
      responseStatus: 201
    });

    sendJsonResponse(res, 201, {
      success: true,
      filename,
      path: `/tps/${filename}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const duration = Date.now() - startTime;

    logError("Image upload failed", {
      error: message,
      url: req.url,
      duration: `${duration}ms`,
      stack: error instanceof Error ? error.stack : undefined
    });

    sendErrorResponse(res, 500, `Error uploading image: ${message}`);
  }
};
