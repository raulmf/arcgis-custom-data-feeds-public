const { expect } = require("chai");
const {
  buildQueryCacheKey,
  clearQueryCache,
  getCachedQueryResponse,
  getQueryCacheConfig,
  setCachedQueryResponse,
} = require("../src/modules/queryCache");

describe("queryCache", () => {
  beforeEach(() => {
    clearQueryCache();
  });

  it("should read enabled TTL and max-entry settings from service params", () => {
    const config = getQueryCacheConfig({
      queryCacheEnabled: "true",
      queryCacheTtlSeconds: "600",
      queryCacheMaxEntries: "1000",
    });

    expect(config.enabled).to.equal(true);
    expect(config.ttlMs).to.equal(600000);
    expect(config.maxEntries).to.equal(1000);
  });

  it("should return cached clones for matching keys", () => {
    const config = getQueryCacheConfig({ queryCacheEnabled: "true" });
    const key = buildQueryCacheKey({ table: "a", query: { where: "1=1" } });
    const value = { type: "FeatureCollection", features: [{ properties: { id: 1 } }] };

    setCachedQueryResponse(key, value, config);
    const cached = getCachedQueryResponse(key, config);
    cached.features[0].properties.id = 2;

    expect(getCachedQueryResponse(key, config).features[0].properties.id).to.equal(1);
  });

  it("should not return entries when cache is disabled", () => {
    const enabled = getQueryCacheConfig({ queryCacheEnabled: "true" });
    const disabled = getQueryCacheConfig({ queryCacheEnabled: "false" });
    const key = buildQueryCacheKey({ table: "a" });

    setCachedQueryResponse(key, { ok: true }, enabled);

    expect(getCachedQueryResponse(key, disabled)).to.equal(null);
  });
});
