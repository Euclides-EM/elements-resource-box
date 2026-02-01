import http, { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";

type FeatureInput = {
  name: string;
  description?: string;
  is_root: boolean;
  is_default?: boolean;
};

type FeatureRevisionInput = {
  prompt?: string;
  regex?: string;
  execution_strategy: "prompt" | "regex";
  note?: string;
  type: "annotation" | "ner";
  features?: Array<{ id: string }>;
};

type ExecutionInput = {
  dataset: string;
  keys?: string[];
  apply: Array<{ feature: string; revision?: string }>;
  policy?: { skip_if?: Array<"feature_exist" | "revision_exist" | "human_reviewed"> };
};

type ResultInput = {
  feature: string;
  source: {
    resp?: string;
    id?: string;
    revision?: string;
    name?: string;
  };
  values: Array<Record<string, unknown>>;
  note?: string;
};

type FeatureRevision = FeatureRevisionInput & {
  id: string;
  created_at: string;
};

type FeatureRecord = FeatureInput & {
  id: string;
  created_at: string;
  updated_at: string;
  revisions: FeatureRevision[];
};

type ExecutionRecord = ExecutionInput & {
  id: string;
  created_at: string;
  completed_at?: string;
  status: "success" | "failed" | "in_progress" | "canceling" | "canceled";
};

type ResultRecord = ResultInput;

type DatasetStore = Map<string, FeatureRecord>;

type Store = {
  datasets: Map<string, DatasetStore>;
  executions: Map<string, ExecutionRecord>;
  results: Map<string, ResultRecord[]>;
};

const store: Store = {
  datasets: new Map(),
  executions: new Map(),
  results: new Map(),
};

let featureCounter = 1;
let revisionCounter = 1;
let executionCounter = 1;

const nowIso = () => new Date().toISOString();

const readJsonBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) {
    return {};
  }
  return JSON.parse(raw);
};

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(payload));
};

const sendEmpty = (res: ServerResponse, status: number) => {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
  });
  res.end();
};

const sendText = (res: ServerResponse, status: number, payload: string) => {
  res.writeHead(status, {
    "Content-Type": "application/octet-stream",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(payload);
};

const getDataset = (datasetId: string): DatasetStore => {
  let dataset = store.datasets.get(datasetId);
  if (!dataset) {
    dataset = new Map();
    store.datasets.set(datasetId, dataset);
  }
  return dataset;
};

const serializeFeature = (feature: FeatureRecord, expand: Set<string>) => {
  const base: Record<string, unknown> = {
    id: feature.id,
    name: feature.name,
    description: feature.description,
    is_root: feature.is_root,
    is_default: feature.is_default,
    created_at: feature.created_at,
    updated_at: feature.updated_at,
  };

  if (expand.has("latest_revision")) {
    base.latest_revision = feature.revisions[feature.revisions.length - 1];
  }
  if (expand.has("revisions")) {
    base.revisions = feature.revisions;
  }

  return base;
};

const withCors = (res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
};

const server = http.createServer(async (req, res) => {
  withCors(res);

  if (!req.url || !req.method) {
    sendJson(res, 400, { error: "Invalid request" });
    return;
  }

  if (req.method === "OPTIONS") {
    sendEmpty(res, 204);
    return;
  }

  let url: URL;
  try {
    url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  } catch {
    sendJson(res, 400, { error: "Invalid URL" });
    return;
  }

  const path = url.pathname;

  const featureListMatch = path.match(/^\/dataset\/([^/]+)\/features$/);
  if (featureListMatch) {
    const datasetId = decodeURIComponent(featureListMatch[1]);
    const dataset = getDataset(datasetId);
    const expand = new Set(
      (url.searchParams.get("expand") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );

    if (req.method === "GET") {
      const features = Array.from(dataset.values()).map((feature) =>
        serializeFeature(feature, expand),
      );
      sendJson(res, 200, features);
      return;
    }

    if (req.method === "POST") {
      try {
        const body = (await readJsonBody(req)) as FeatureInput;
        if (!body?.name || typeof body.is_root !== "boolean") {
          sendJson(res, 400, { error: "Missing required fields" });
          return;
        }
        const id = `fea_${featureCounter++}`;
        const timestamp = nowIso();
        const record: FeatureRecord = {
          id,
          name: body.name,
          description: body.description,
          is_root: body.is_root,
          is_default: body.is_default,
          created_at: timestamp,
          updated_at: timestamp,
          revisions: [],
        };
        dataset.set(id, record);
        sendJson(res, 201, serializeFeature(record, expand));
        return;
      } catch {
        sendJson(res, 400, { error: "Invalid JSON" });
        return;
      }
    }
  }

  const featureMatch = path.match(/^\/dataset\/([^/]+)\/features\/([^/]+)$/);
  if (featureMatch) {
    const datasetId = decodeURIComponent(featureMatch[1]);
    const featureId = decodeURIComponent(featureMatch[2]);
    const dataset = getDataset(datasetId);
    const feature = dataset.get(featureId);
    const expand = new Set(
      (url.searchParams.get("expand") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );

    if (!feature) {
      sendJson(res, 404, { error: "Feature not found" });
      return;
    }

    if (req.method === "GET") {
      sendJson(res, 200, serializeFeature(feature, expand));
      return;
    }

    if (req.method === "PUT") {
      try {
        const body = (await readJsonBody(req)) as FeatureInput;
        if (!body?.name || typeof body.is_root !== "boolean") {
          sendJson(res, 400, { error: "Missing required fields" });
          return;
        }
        feature.name = body.name;
        feature.description = body.description;
        feature.is_root = body.is_root;
        feature.is_default = body.is_default;
        feature.updated_at = nowIso();
        sendJson(res, 200, serializeFeature(feature, expand));
        return;
      } catch {
        sendJson(res, 400, { error: "Invalid JSON" });
        return;
      }
    }

    if (req.method === "DELETE") {
      dataset.delete(featureId);
      sendEmpty(res, 204);
      return;
    }
  }

  const revisionListMatch = path.match(
    /^\/dataset\/([^/]+)\/features\/([^/]+)\/revisions$/,
  );
  if (revisionListMatch) {
    const datasetId = decodeURIComponent(revisionListMatch[1]);
    const featureId = decodeURIComponent(revisionListMatch[2]);
    const dataset = getDataset(datasetId);
    const feature = dataset.get(featureId);

    if (!feature) {
      sendJson(res, 404, { error: "Feature not found" });
      return;
    }

    if (req.method === "GET") {
      sendJson(res, 200, feature.revisions);
      return;
    }

    if (req.method === "POST") {
      try {
        const body = (await readJsonBody(req)) as FeatureRevisionInput;
        if (!body?.execution_strategy || !body?.type) {
          sendJson(res, 400, { error: "Missing required fields" });
          return;
        }
        const revision: FeatureRevision = {
          ...body,
          id: `rev_${revisionCounter++}`,
          created_at: nowIso(),
        };
        feature.revisions.push(revision);
        feature.updated_at = nowIso();
        sendJson(res, 201, revision);
        return;
      } catch {
        sendJson(res, 400, { error: "Invalid JSON" });
        return;
      }
    }
  }

  const revisionMatch = path.match(
    /^\/dataset\/([^/]+)\/features\/([^/]+)\/revisions\/([^/]+)$/,
  );
  if (revisionMatch) {
    const datasetId = decodeURIComponent(revisionMatch[1]);
    const featureId = decodeURIComponent(revisionMatch[2]);
    const revisionId = decodeURIComponent(revisionMatch[3]);
    const dataset = getDataset(datasetId);
    const feature = dataset.get(featureId);

    if (!feature) {
      sendJson(res, 404, { error: "Feature not found" });
      return;
    }

    if (req.method === "GET") {
      const revision = feature.revisions.find((item) => item.id === revisionId);
      if (!revision) {
        sendJson(res, 404, { error: "Revision not found" });
        return;
      }
      sendJson(res, 200, revision);
      return;
    }
  }

  if (path === "/executions") {
    if (req.method === "GET") {
      const datasetFilter = url.searchParams.get("dataset");
      const featureFilter = new Set(
        (url.searchParams.get("features") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      );
      const statusFilter = new Set(
        (url.searchParams.get("status") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      );

      let executions = Array.from(store.executions.values());
      if (datasetFilter) {
        executions = executions.filter((exec) => exec.dataset === datasetFilter);
      }
      if (featureFilter.size > 0) {
        executions = executions.filter((exec) =>
          exec.apply.some((item) => featureFilter.has(item.feature)),
        );
      }
      if (statusFilter.size > 0) {
        executions = executions.filter((exec) => statusFilter.has(exec.status));
      }
      sendJson(res, 200, executions);
      return;
    }

    if (req.method === "POST") {
      try {
        const body = (await readJsonBody(req)) as ExecutionInput;
        if (!body?.dataset || !Array.isArray(body.apply)) {
          sendJson(res, 400, { error: "Missing required fields" });
          return;
        }
        const execution: ExecutionRecord = {
          ...body,
          id: `exe_${executionCounter++}`,
          created_at: nowIso(),
          status: "in_progress",
        };
        store.executions.set(execution.id, execution);
        sendJson(res, 201, execution);
        return;
      } catch {
        sendJson(res, 400, { error: "Invalid JSON" });
        return;
      }
    }
  }

  const executionMatch = path.match(/^\/executions\/([^/]+)$/);
  if (executionMatch) {
    const executionId = decodeURIComponent(executionMatch[1]);
    const execution = store.executions.get(executionId);

    if (!execution) {
      sendJson(res, 404, { error: "Execution not found" });
      return;
    }

    if (req.method === "GET") {
      sendJson(res, 200, execution);
      return;
    }
  }

  const executionCancelMatch = path.match(/^\/executions\/([^/]+)\/cancel$/);
  if (executionCancelMatch) {
    const executionId = decodeURIComponent(executionCancelMatch[1]);
    const execution = store.executions.get(executionId);

    if (!execution) {
      sendJson(res, 404, { error: "Execution not found" });
      return;
    }

    if (req.method === "PUT") {
      if (execution.status !== "canceled") {
        execution.status = "canceling";
      }
      sendJson(res, 200, execution);
      return;
    }
  }

  const resultMatch = path.match(/^\/results\/([^/]+)$/);
  if (resultMatch) {
    const key = decodeURIComponent(resultMatch[1]);
    const results = store.results.get(key) ?? [];

    if (req.method === "GET") {
      const featureFilter = new Set(
        (url.searchParams.get("features") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      );
      const filtered =
        featureFilter.size > 0
          ? results.filter((result) => featureFilter.has(result.feature))
          : results;
      sendJson(res, 200, filtered);
      return;
    }

    if (req.method === "POST") {
      try {
        const body = (await readJsonBody(req)) as ResultInput;
        if (!body?.feature || !body?.source || !Array.isArray(body.values)) {
          sendJson(res, 400, { error: "Missing required fields" });
          return;
        }
        const existingIndex = results.findIndex(
          (result) => result.feature === body.feature,
        );
        if (existingIndex >= 0) {
          results[existingIndex] = body;
        } else {
          results.push(body);
        }
        store.results.set(key, results);
        sendJson(res, 201, body);
        return;
      } catch {
        sendJson(res, 400, { error: "Invalid JSON" });
        return;
      }
    }
  }

  const teiMatch = path.match(/^\/dataset\/([^/]+)\/tei$/);
  if (teiMatch && req.method === "GET") {
    const datasetId = decodeURIComponent(teiMatch[1]);
    const key = url.searchParams.get("key") ?? "";
    const features = url.searchParams.get("features") ?? "";

    const payload = `<?xml version="1.0" encoding="UTF-8"?>\n<TEI data-set="${datasetId}" key="${key}" features="${features}">\n  <text>Mock TEI content</text>\n</TEI>`;
    sendText(res, 200, payload);
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(8085, () => {
  console.log("Hub server mock listening on http://localhost:8085");
});
