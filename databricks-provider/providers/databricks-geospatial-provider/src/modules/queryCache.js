const cache = new Map();

function getQueryCacheConfig(params = {}, env = process.env) {
  const enabled = parseBoolean(params.queryCacheEnabled, parseBoolean(env.DATABRICKS_QUERY_CACHE_ENABLED, false));
  const ttlSeconds = parsePositiveInteger(params.queryCacheTtlSeconds, parsePositiveInteger(env.DATABRICKS_QUERY_CACHE_TTL_SECONDS, 300));
  const maxEntries = parsePositiveInteger(params.queryCacheMaxEntries, parsePositiveInteger(env.DATABRICKS_QUERY_CACHE_MAX_ENTRIES, 500));

  return {
    enabled,
    ttlMs: ttlSeconds * 1000,
    maxEntries,
  };
}

function getCachedQueryResponse(key, config) {
  if (!config.enabled) return null;

  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  // Refresh insertion order so hot tiles survive max-entry pruning.
  cache.delete(key);
  cache.set(key, entry);
  return clone(entry.value);
}

function setCachedQueryResponse(key, value, config) {
  if (!config.enabled || config.ttlMs <= 0 || config.maxEntries <= 0) return;

  cache.set(key, {
    expiresAt: Date.now() + config.ttlMs,
    value: clone(value),
  });

  while (cache.size > config.maxEntries) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

function buildQueryCacheKey(parts) {
  return stableStringify(parts);
}

function clearQueryCache() {
  cache.clear();
}

function parseBoolean(value, fallback) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    ).join(",")}}`;
  }

  return JSON.stringify(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = {
  buildQueryCacheKey,
  clearQueryCache,
  getCachedQueryResponse,
  getQueryCacheConfig,
  setCachedQueryResponse,
};
