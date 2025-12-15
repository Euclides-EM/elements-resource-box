import fs from "fs";
import path from "path";
import { config } from "dotenv";

config();

const GITHUB_API_BASE =
  "https://api.github.com/repos/Euclides-EM/elements-facsimile/contents";
const DIAGRAMS_PATH = "docs/diagrams";
const OUTPUT_DIR = "public/docs";
const GITHUB_PAT = process.env.GITHUB_PAT;

function getHeaders() {
  const headers = {
    "User-Agent": "elements-title-pages-build",
  };

  if (GITHUB_PAT) {
    headers["Authorization"] = `token ${GITHUB_PAT}`;
  }

  return headers;
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: getHeaders(),
      });
      if (response.ok) {
        return await response.json();
      }
      if (response.status === 403) {
        const resetTime = response.headers.get("X-RateLimit-Reset");
        const remaining = response.headers.get("X-RateLimit-Remaining");
        console.warn(
          `Rate limit hit (${remaining} remaining), retrying in ${Math.pow(2, i)} seconds...`,
        );
        if (resetTime) {
          const resetDate = new Date(parseInt(resetTime) * 1000);
          console.warn(`Rate limit resets at: ${resetDate.toISOString()}`);
        }
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 1000),
        );
        continue;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

function groupDirectoriesByBase(directories) {
  const grouped = {};

  directories.forEach((dir) => {
    const volMatch = dir.match(/^(.+)_vol(\d+)$/);
    if (volMatch) {
      const [, baseKey, volNumber] = volMatch;
      if (!grouped[baseKey]) {
        grouped[baseKey] = [];
      }
      grouped[baseKey].push({ key: dir, volume: parseInt(volNumber) });
    } else {
      if (!grouped[dir]) {
        grouped[dir] = [];
      }
      grouped[dir].push({ key: dir, volume: 1 });
    }
  });

  Object.keys(grouped).forEach((baseKey) => {
    grouped[baseKey].sort((a, b) => a.volume - b.volume);
  });

  return grouped;
}

async function generateDiagramDirectories() {
  const outputPath = path.join(OUTPUT_DIR, "diagram-directories.json");

  try {
    console.log("Fetching diagram directories from GitHub API...");
    const data = await fetchWithRetry(`${GITHUB_API_BASE}/${DIAGRAMS_PATH}`);

    if (Array.isArray(data)) {
      const directories = data
        .filter((item) => item.type === "dir")
        .map((item) => item.name);

      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify(directories, null, 2));
      console.log(
        `Generated ${outputPath} with ${directories.length} directories`,
      );
    }
  } catch (error) {
    console.error("Failed to generate diagram directories:", error);
  }
}

async function generateDiagramData(baseKey, volumes) {
  const outputPath = path.join(OUTPUT_DIR, "diagrams", `${baseKey}.json`);

  if (fs.existsSync(outputPath)) {
    return;
  }

  try {
    const volumeData = [];

    for (const volumeInfo of volumes) {
      const cropsUrl = `${GITHUB_API_BASE}/${DIAGRAMS_PATH}/${volumeInfo.key}/crops`;

      try {
        const cropsData = await fetchWithRetry(cropsUrl);

        if (Array.isArray(cropsData)) {
          const images = cropsData
            .filter((file) => file.name.endsWith(".jpg"))
            .map((file) => file.name);

          volumeData.push({
            volume: volumes.length > 1 ? volumeInfo.volume : undefined,
            key: volumeInfo.key,
            images,
            hasNoDiagrams: images.length === 0,
          });
        }
      } catch (volumeError) {
        volumeData.push({
          volume: volumes.length > 1 ? volumeInfo.volume : undefined,
          key: volumeInfo.key,
          images: [],
          hasNoDiagrams: true,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const result = volumes.length > 1 ? { volumes: volumeData } : volumeData[0];

    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    const totalImages = volumeData.reduce(
      (sum, vol) => sum + vol.images.length,
      0,
    );
    console.log(
      `Generated diagrams data for ${baseKey}: ${totalImages} images across ${volumes.length} volume(s)`,
    );
  } catch (error) {
    const result =
      volumes.length > 1
        ? {
            volumes: volumes.map((v) => ({
              volume: v.volume,
              key: v.key,
              images: [],
              hasNoDiagrams: true,
            })),
          }
        : { images: [], hasNoDiagrams: true };

    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  }
}

async function generateAllDiagramData() {
  const directoriesPath = path.join(OUTPUT_DIR, "diagram-directories.json");

  if (!fs.existsSync(directoriesPath)) {
    console.log(
      "No diagram directories file found, skipping diagram data generation",
    );
    return;
  }

  const directories = JSON.parse(fs.readFileSync(directoriesPath, "utf8"));
  const groupedDirectories = groupDirectoriesByBase(directories);

  const missingBaseKeys = Object.keys(groupedDirectories).filter((baseKey) => {
    const outputPath = path.join(OUTPUT_DIR, "diagrams", `${baseKey}.json`);
    return !fs.existsSync(outputPath);
  });

  if (missingBaseKeys.length === 0) {
    console.log("All diagram data files already exist, skipping...");
    return;
  }

  console.log(
    `Generating diagram data for ${missingBaseKeys.length} of ${Object.keys(groupedDirectories).length} base entries...`,
  );

  for (const baseKey of missingBaseKeys) {
    const volumes = groupedDirectories[baseKey];
    await generateDiagramData(baseKey, volumes);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

export function facsimileListingPlugin() {
  return {
    name: "facsimile-listing",
    async buildStart() {
      await generateDiagramDirectories();
      await generateAllDiagramData();
    },
  };
}
