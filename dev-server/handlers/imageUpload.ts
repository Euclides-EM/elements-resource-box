import type { IncomingMessage, ServerResponse } from "http";
import fs from "fs";
import path from "path";
import {
  parseMultipartFormData,
  sendJsonResponse,
  sendErrorResponse,
} from "../util-request";

const IMAGE_UPLOAD_API_PATH = "/api/upload-image";

const saveImageFile = (imageData: Buffer, filename: string): void => {
  const publicDir = path.resolve("public/tps");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const filePath = path.join(publicDir, filename);
  fs.writeFileSync(filePath, imageData);
};

export const isImageUploadRequest = (req: IncomingMessage): boolean => {
  return req.method === "POST" && req.url === IMAGE_UPLOAD_API_PATH;
};

export const handleImageUploadRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  try {
    const { fields, files } = await parseMultipartFormData(req);

    const key = fields.key;
    if (!key) {
      sendErrorResponse(res, 400, "Key is required for image upload");
      return;
    }

    if (!files.file) {
      sendErrorResponse(res, 400, "No file provided");
      return;
    }

    const fileExtension =
      files.file.name.split(".").pop()?.toLowerCase() || "png";
    const filename = `${key}_tp.${fileExtension}`;

    saveImageFile(files.file.data, filename);

    sendJsonResponse(res, 201, {
      success: true,
      filename,
      path: `/tps/${filename}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendErrorResponse(res, 500, `Error uploading image: ${message}`);
  }
};
