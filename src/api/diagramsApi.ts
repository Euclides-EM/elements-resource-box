import { EditionsService } from "../../hub-api/services/EditionsService";
import type { api_editionDiagramVolume } from "../../hub-api/models/api_editionDiagramVolume";
import type { api_editionDiagramsResponse } from "../../hub-api/models/api_editionDiagramsResponse";

export interface VolumeData {
  volume?: number;
  key: string;
  images: string[];
  hasNoDiagrams: boolean;
}

export interface DiagramsResult {
  images?: string[];
  hasNoDiagrams?: boolean;
  volumes?: VolumeData[];
  error?: string;
}

const mapImages = (imagesByName?: Record<string, string>): string[] => {
  return Object.values(imagesByName || {});
};

const mapVolume = (
  key: string,
  volume: api_editionDiagramVolume,
): VolumeData => ({
  volume: volume.volume,
  key: volume.key || key,
  images: mapImages(volume.imageUrlsByName),
  hasNoDiagrams: Boolean(volume.hasNoDiagrams),
});

const mapDiagramResponse = (
  key: string,
  response: api_editionDiagramsResponse,
): DiagramsResult => {
  if (response.volumes && response.volumes.length > 0) {
    return {
      hasNoDiagrams: Boolean(response.hasNoDiagrams),
      volumes: response.volumes.map((volume) => mapVolume(key, volume)),
    };
  }

  return {
    hasNoDiagrams: Boolean(response.hasNoDiagrams),
    images: mapImages(response.imageUrlsByName),
  };
};

export const fetchDiagrams = async (key: string): Promise<DiagramsResult> => {
  if (!key) {
    return {
      images: [],
      hasNoDiagrams: false,
      error: "No key provided",
    };
  }

  try {
    const response = await EditionsService.getEditionsDiagrams1({ key });
    return mapDiagramResponse(key, response);
  } catch {
    return {
      images: [],
      hasNoDiagrams: false,
      error: "Failed to load diagrams",
    };
  }
};

export const fetchDiagramDirectories = async (): Promise<Set<string>> => {
  try {
    const keys = await EditionsService.getEditionsDiagrams();
    return new Set(keys);
  } catch {
    return new Set();
  }
};
