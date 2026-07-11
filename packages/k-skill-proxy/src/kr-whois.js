const { isIP } = require("node:net");

const KR_WHOIS_DOMAIN_URL = "https://apis.data.go.kr/B551505/whois/domain_name";
const KR_WHOIS_IP_URL = "https://apis.data.go.kr/B551505/whois/ip_address";
const KR_WHOIS_AS_URL = "https://apis.data.go.kr/B551505/whois/as_number";

function trimOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function normalizeKrWhoisDomainQuery(query = {}) {
  const domain = trimOrNull(query.domain ?? query.query ?? query.q);
  if (!domain) {
    throw new Error("Provide domain.");
  }
  const normalized = domain.toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  if (!/^[a-z0-9가-힣.-]+\.(?:kr|한국)$/u.test(normalized)) {
    throw new Error("Provide a .kr or .한국 domain.");
  }
  if (normalized.includes("..") || normalized.startsWith(".") || normalized.endsWith(".")) {
    throw new Error("Provide a valid domain.");
  }
  const labels = normalized.split(".");
  if (normalized.length > 253 || labels.some((label) => !label || label.length > 63 || label.startsWith("-") || label.endsWith("-"))) {
    throw new Error("Provide a valid domain.");
  }
  return { query: normalized, answer: "json" };
}

function normalizeKrWhoisIpQuery(query = {}) {
  const ip = trimOrNull(query.ip ?? query.query ?? query.q);
  if (!ip) {
    throw new Error("Provide IP address.");
  }
  if (!isIP(ip)) {
    throw new Error("Provide a valid IP address.");
  }
  return { query: ip.toLowerCase(), answer: "json" };
}

function normalizeKrWhoisAsQuery(query = {}) {
  const raw = trimOrNull(query.asn ?? query.as ?? query.query ?? query.q);
  if (!raw) {
    throw new Error("Provide AS number.");
  }
  const match = /^AS([0-9]+)$/i.exec(raw);
  if (!match) {
    throw new Error("Provide AS number in AS1234 format.");
  }
  const number = Number.parseInt(match[1], 10);
  if (!Number.isSafeInteger(number) || number < 1 || number > 4294967295) {
    throw new Error("Provide a valid AS number.");
  }
  return { query: `AS${number}`, answer: "json" };
}

function isKrWhoisGatewayError(text) {
  return text.includes("<OpenAPI_ServiceResponse") || text.includes("SERVICE KEY IS NOT REGISTERED");
}

function redactSecretValue(text, secret) {
  let redacted = String(text);
  const encodedSecret = new URLSearchParams({ serviceKey: String(secret) })
    .toString()
    .slice("serviceKey=".length);
  for (const candidate of new Set([String(secret), encodedSecret])) {
    if (candidate) {
      redacted = redacted.split(candidate).join("[REDACTED]");
    }
  }
  return redacted.replace(/serviceKey(?:=|%3D)[^&\s"'<>\\]+/giu, "serviceKey=[REDACTED]");
}

function isKrWhoisSuccessBody(text) {
  try {
    const payload = JSON.parse(String(text));
    const resultCode = payload?.response?.result?.result_code ?? payload?.result_code;
    return String(resultCode) === "10000";
  } catch {
    return false;
  }
}

async function proxyKrWhoisRequest({ url: upstreamUrl, params, serviceKey, fetchImpl = global.fetch }) {
  if (!serviceKey) {
    return {
      statusCode: 503,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        error: "upstream_not_configured",
        message: "DATA_GO_KR_API_KEY is not configured on the proxy server."
      })
    };
  }

  const url = new URL(upstreamUrl);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("query", params.query);
  url.searchParams.set("answer", params.answer);

  let response;
  try {
    response = await fetchImpl(url.toString(), {
      signal: AbortSignal.timeout(20000)
    });
  } catch {
    return {
      statusCode: 502,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        error: "upstream_fetch_failed",
        message: "WHOIS upstream request failed."
      })
    };
  }
  const body = redactSecretValue(await response.text(), serviceKey);
  if (isKrWhoisGatewayError(body)) {
    return {
      statusCode: 502,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        error: "upstream_forbidden",
        message: "WHOIS upstream rejected the request. The proxy key may not be approved for service 15094277."
      })
    };
  }
  return {
    statusCode: response.status,
    contentType: response.headers.get("content-type") || "application/json; charset=utf-8",
    body
  };
}

function proxyKrWhoisDomainRequest(options) {
  return proxyKrWhoisRequest({ ...options, url: KR_WHOIS_DOMAIN_URL });
}

function proxyKrWhoisIpRequest(options) {
  return proxyKrWhoisRequest({ ...options, url: KR_WHOIS_IP_URL });
}

function proxyKrWhoisAsRequest(options) {
  return proxyKrWhoisRequest({ ...options, url: KR_WHOIS_AS_URL });
}

module.exports = {
  KR_WHOIS_AS_URL,
  KR_WHOIS_DOMAIN_URL,
  KR_WHOIS_IP_URL,
  isKrWhoisSuccessBody,
  normalizeKrWhoisAsQuery,
  normalizeKrWhoisDomainQuery,
  normalizeKrWhoisIpQuery,
  proxyKrWhoisAsRequest,
  proxyKrWhoisDomainRequest,
  proxyKrWhoisIpRequest
};
