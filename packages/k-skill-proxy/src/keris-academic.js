const RISS_OPEN_API_URL = "https://www.riss.kr/openApi";
const RESOURCE_TYPE_MAP = Object.freeze({
  ALL: ["T", "A", "O", "U", "F", "S"],
  T: ["T"],
  A: ["A", "O"],
  D: ["A"],
  B: ["U"]
});
const SEARCH_FIELDS = ["keyword", "title", "author", "subject", "publisher"];

function trimOrNull(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function parseBoundedInteger(value, { defaultValue, max, label }) {
  const text = trimOrNull(value);
  if (text === null) return defaultValue;
  if (!/^\d+$/.test(text)) throw new Error(`${label} must be an integer.`);
  const parsed = Number.parseInt(text, 10);
  if (parsed < 1 || parsed > max) throw new Error(`${label} must be between 1 and ${max}.`);
  return parsed;
}

function validateSearchText(value, label) {
  const text = trimOrNull(value);
  if (text === null) return null;
  if (text.length > 200 || /[\u0000-\u001f\u007f]/.test(text)) {
    throw new Error(`Provide valid ${label} (1-200 characters).`);
  }
  return text;
}

function rejectUnsupportedQuery(query) {
  const supported = new Set([
    ...SEARCH_FIELDS,
    "resourceType", "resource_type", "type", "page", "pageSize", "page_size"
  ]);
  const controlled = new Set(["key", "servicekey", "version", "rsnum", "rowcount"]);
  for (const key of Object.keys(query)) {
    if (controlled.has(key.toLowerCase())) throw new Error(`${key} is controlled by the proxy server.`);
    if (!supported.has(key)) throw new Error(`${key} is not supported for KERIS academic search.`);
  }
}

function normalizeKerisAcademicQuery(query = {}) {
  rejectUnsupportedQuery(query);
  const normalized = {};
  for (const field of SEARCH_FIELDS) {
    const value = validateSearchText(query[field], field);
    if (value !== null) normalized[field] = value;
  }
  if (!SEARCH_FIELDS.some((field) => normalized[field])) {
    throw new Error("Provide at least one search field: keyword, title, author, subject, or publisher.");
  }
  const resourceType = (trimOrNull(query.resourceType ?? query.resource_type ?? query.type) || "ALL").toUpperCase();
  const upstreamTypes = RESOURCE_TYPE_MAP[resourceType];
  if (!upstreamTypes) throw new Error(`resourceType must be one of: ${Object.keys(RESOURCE_TYPE_MAP).join(", ")}.`);
  const page = parseBoundedInteger(query.page, { defaultValue: 1, max: 100000, label: "page" });
  const pageSize = parseBoundedInteger(query.pageSize ?? query.page_size, {
    defaultValue: 10,
    max: 100,
    label: "pageSize"
  });
  if (upstreamTypes.length > 1 && page > 1) {
    throw new Error("Combined resourceType searches support page 1 only; choose a single type for later pages.");
  }
  return {
    ...normalized,
    resourceType,
    upstreamTypes: [...upstreamTypes],
    page,
    pageSize,
    rsnum: ((page - 1) * pageSize) + 1
  };
}

function decodeXmlEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower === "amp") return "&";
    if (lower === "lt") return "<";
    if (lower === "gt") return ">";
    if (lower === "quot") return '"';
    if (lower === "apos") return "'";
    const codePoint = lower.startsWith("#x")
      ? Number.parseInt(lower.slice(2), 16)
      : Number.parseInt(lower.slice(1), 10);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
  });
}

function parseXmlDocument(xml) {
  const source = trimOrNull(xml);
  if (!source || !source.startsWith("<")) throw new Error("RISS upstream did not return XML.");
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error("RISS upstream XML contains unsupported declarations.");
  const document = { name: "#document", children: [], text: "" };
  const stack = [document];
  const tokens = source.match(/<!--[^]*?-->|<!\[CDATA\[[^]*?\]\]>|<\?[^]*?\?>|<[^>]+>|[^<]+/g);
  if (!tokens || tokens.join("") !== source) throw new Error("RISS upstream returned malformed XML.");
  for (const token of tokens) {
    if (token.startsWith("<!--") || token.startsWith("<?")) continue;
    if (token.startsWith("<![CDATA[")) {
      stack[stack.length - 1].text += token.slice(9, -3);
    } else if (!token.startsWith("<")) {
      stack[stack.length - 1].text += decodeXmlEntities(token);
    } else if (token.startsWith("</")) {
      const name = token.slice(2, -1).trim();
      if (stack.length === 1 || stack[stack.length - 1].name !== name) throw new Error("RISS upstream returned malformed XML.");
      stack.pop();
    } else {
      if (token.startsWith("<!")) throw new Error("RISS upstream XML contains unsupported markup.");
      const selfClosing = /\/\s*>$/.test(token);
      const match = token.match(/^<([A-Za-z_][\w:.-]*)(?:\s[^>]*)?\/?\s*>$/);
      if (!match) throw new Error("RISS upstream returned malformed XML.");
      const node = { name: match[1], children: [], text: "" };
      stack[stack.length - 1].children.push(node);
      if (!selfClosing) stack.push(node);
    }
  }
  if (stack.length !== 1 || document.children.length !== 1) throw new Error("RISS upstream returned malformed XML.");
  return document.children[0];
}

function child(node, name) {
  return node.children.find((entry) => entry.name.toLowerCase() === name.toLowerCase()) || null;
}

function children(node, name) {
  return node.children.filter((entry) => entry.name.toLowerCase() === name.toLowerCase());
}

function nodeText(node) {
  if (!node) return null;
  const nested = node.children.map(nodeText).filter(Boolean).join(" ");
  return trimOrNull(`${node.text}${nested ? ` ${nested}` : ""}`);
}

function metadataValues(node) {
  const values = new Map();
  for (const entry of node.children) {
    const key = entry.name.replace(/^riss\./i, "").toLowerCase();
    const value = nodeText(entry);
    if (value === null) continue;
    if (!values.has(key)) values.set(key, []);
    values.get(key).push(value);
  }
  return values;
}

function first(values, key) {
  return values.get(key)?.[0] ?? null;
}

function splitAuthors(value) {
  if (!value) return [];
  const explicit = value.split(/\s*[;,|]\s*/).filter(Boolean);
  if (explicit.length > 1) return explicit;
  const koreanNames = value.split(/\s+/).filter(Boolean);
  if (koreanNames.length > 1 && koreanNames.every((name) => /^[가-힣]{2,4}$/.test(name))) return koreanNames;
  return [value];
}

function normalizeMetadata(node) {
  const values = metadataValues(node);
  const image = first(values, "image")?.toUpperCase() ?? null;
  const charge = first(values, "charge");
  const fullTextAvailable = image === "Y" ? true : image === "N" ? false : null;
  let fullTextAccess = "unknown";
  if (fullTextAvailable === false) fullTextAccess = "none";
  if (fullTextAvailable === true && charge === "1") fullTextAccess = "free";
  if (fullTextAvailable === true && charge === "0") fullTextAccess = "paid_or_restricted";
  if (fullTextAvailable === true && charge === null) fullTextAccess = "available";
  return {
    resource_type: first(values, "type"),
    title: first(values, "title"),
    authors: splitAuthors(first(values, "author")),
    publisher: first(values, "publisher"),
    year: first(values, "pubdate"),
    publication: first(values, "stitle"),
    material_type: first(values, "mtype"),
    link: first(values, "url"),
    full_text_available: fullTextAvailable,
    full_text_access: fullTextAccess,
    holdings: values.get("holdings") || [],
  };
}

function parseRissXml(xml) {
  let root;
  try {
    root = parseXmlDocument(xml);
  } catch (error) {
    error.code = "upstream_invalid_response";
    throw error;
  }
  if (root.name.toLowerCase() !== "record") {
    const error = new Error("RISS upstream returned an invalid response envelope.");
    error.code = "upstream_invalid_response";
    throw error;
  }
  const head = child(root, "head");
  if (!head) {
    const error = new Error("RISS upstream response is missing head metadata.");
    error.code = "upstream_invalid_response";
    throw error;
  }
  const errorCode = nodeText(child(head, "Error"));
  if (errorCode === null) {
    const error = new Error("RISS upstream response is missing status metadata.");
    error.code = "upstream_invalid_response";
    throw error;
  }
  const errorMessage = nodeText(child(head, "ErrorMessage")) || "Unknown RISS error";
  if (errorCode !== null && !["0", "000"].includes(errorCode)) {
    const error = new Error(errorMessage);
    error.code = ["004", "4"].includes(errorCode) || /인증|AUTH|KEY/i.test(errorMessage)
      ? "upstream_forbidden"
      : /쿼터|호출량|초과|QUOTA|LIMIT/i.test(errorMessage)
        ? "upstream_quota_exceeded"
        : "upstream_error";
    error.upstreamCode = errorCode;
    throw error;
  }
  const items = children(root, "metadata").map(normalizeMetadata);
  const totalCount = Number.parseInt(nodeText(child(head, "totalcount")) ?? String(items.length), 10);
  if (!Number.isFinite(totalCount) || totalCount < 0) {
    const error = new Error("RISS upstream returned invalid totalcount metadata.");
    error.code = "upstream_invalid_response";
    throw error;
  }
  return { totalCount, items };
}

function errorResult(error, message) {
  return { status_code: 502, error, message };
}

async function fetchOneRissType({ params, upstreamType, apiKey, fetchImpl }) {
  const url = new URL(RISS_OPEN_API_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("version", "1.0");
  url.searchParams.set("type", upstreamType);
  for (const field of SEARCH_FIELDS) if (params[field]) url.searchParams.set(field, params[field]);
  url.searchParams.set("rsnum", String(params.rsnum));
  url.searchParams.set("rowcount", String(params.pageSize));
  let response;
  try {
    response = await fetchImpl(url.toString(), { signal: AbortSignal.timeout(20000) });
  } catch {
    return errorResult("upstream_unavailable", "RISS upstream request failed.");
  }
  const text = await response.text();
  if (response.status === 401 || response.status === 403) return errorResult("upstream_forbidden", "RISS upstream rejected the proxy key.");
  if (response.status === 429) return errorResult("upstream_quota_exceeded", "RISS upstream quota was exceeded.");
  if (!response.ok) return errorResult("upstream_error", `RISS upstream returned HTTP ${response.status}.`);
  if (!text.trim()) return errorResult("upstream_invalid_response", "RISS upstream returned an empty response.");
  try {
    return parseRissXml(text);
  } catch (error) {
    return errorResult(error.code || "upstream_invalid_response", `RISS upstream error response: ${error.message}`);
  }
}

async function fetchKerisAcademicSearch({ params, apiKey, fetchImpl = global.fetch }) {
  if (!apiKey) {
    return {
      status_code: 503,
      error: "upstream_not_configured",
      message: "KSKILL_RISS_API_KEY is not configured on the proxy server. RISS_API_KEY is accepted as a compatibility fallback."
    };
  }
  const results = await Promise.all(params.upstreamTypes.map((upstreamType) => fetchOneRissType({
    params, upstreamType, apiKey, fetchImpl
  })));
  const failed = results.find((result) => result.error);
  if (failed) return failed;
  const query = Object.fromEntries(Object.entries(params).filter(([key]) => !new Set(["upstreamTypes", "rsnum"]).has(key)));
  const queues = results.map((result) => [...result.items]);
  const items = [];
  while (items.length < params.pageSize && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      if (queue.length > 0) items.push(queue.shift());
      if (items.length >= params.pageSize) break;
    }
  }
  return {
    query,
    page: params.page,
    page_size: params.pageSize,
    total_count: results.reduce((sum, result) => sum + result.totalCount, 0),
    items,
    source: {
      provider: "KERIS RISS Open API",
      upstream: RISS_OPEN_API_URL,
      upstream_types: params.upstreamTypes,
      response_format: "XML",
      data_go_kr_dataset: null,
      related_catalog_dataset: "15071949"
    }
  };
}

module.exports = {
  RESOURCE_TYPE_MAP,
  RISS_OPEN_API_URL,
  fetchKerisAcademicSearch,
  normalizeKerisAcademicQuery,
  parseRissXml
};
