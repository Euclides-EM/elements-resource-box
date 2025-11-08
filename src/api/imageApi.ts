import { IMAGE_UPLOAD_API_PATH } from "../../common/api.ts";

export const uploadImage = async (
  key: string,
  file: File,
  type: string,
  authToken: string,
) => {
  console.log("Uploading image...", file.name);

  const uploadFormData = new FormData();
  uploadFormData.append("file", file);
  uploadFormData.append("key", key);
  uploadFormData.append("type", type);

  const uploadResponse = await fetch(IMAGE_UPLOAD_API_PATH, {
    method: "POST",
    headers: {
      Authorization: authToken,
    },
    body: uploadFormData,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Failed to upload image: ${uploadResponse.status} ${uploadResponse.statusText}`,
    );
  }

  const uploadResult = await uploadResponse.json();
  return uploadResult.path;
};
