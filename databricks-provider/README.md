# Databricks Provider

ArcGIS Enterprise Custom Data Feeds (CDF) application that exposes Databricks data through a FeatureServer. The application and provider manifests target ArcGIS version **12.1.0**.

This project is based on [anandtrivedi/esri-customdatafeed](https://github.com/anandtrivedi/esri-customdatafeed). The original repository provides the foundation for the adaptations and extensions presented here.

## Architecture portfolio and development approach

**All custom code in this project is produced through vibe coding with OpenAI Codex.** My contribution is defining the goals, guiding architecture and integration decisions, and steering the implementation through prompts, feedback, and iteration. Codex generates the implementation under that direction. Bundled framework code and third-party dependencies retain their original authorship and licenses.

This project showcases several concrete architecture choices:

- A CDF provider boundary connects Databricks data to ArcGIS FeatureServer responses.
- Separate backend paths support analytical queries through Databricks SQL and editable features through Lakebase.
- Per-service configuration selects workspaces, tables, geometry formats, and query behavior without creating a separate provider for every dataset.
- Dedicated modules separate credential resolution, connection pooling, SQL generation, geometry translation, and caching.

The source and documentation show the resulting implementation and its current limitations. The development approach is part of the portfolio: translating integration requirements into code through collaboration with Codex.

## Architecture overview

The provider supports two data paths:

| Backend | Connection | Use |
| --- | --- | --- |
| Lakehouse | Databricks SQL warehouse | Read-only feature queries |
| Lakebase | PostgreSQL with PostGIS | Feature queries and editing |

Setting the service parameter `lakebaseHost` selects Lakebase. Otherwise, the provider uses Databricks SQL. The model translates query results into GeoJSON and metadata for the bundled CDF framework to return as ArcGIS responses.

## Folder guide

| Path | Purpose |
| --- | --- |
| [providers/databricks-geospatial-provider/](providers/databricks-geospatial-provider/) | Provider implementation, configuration, and tests |
| [src/](src/) | Application startup, provider loading, and request middleware |
| [framework/](framework/) | Bundled CDF server, FeatureServer output, query processing, cache, and logging |
| [config/default.json](config/default.json) | Local server settings; default port is `8080` |
| [cdconfig.json](cdconfig.json) | CDF application manifest |
| [databricks-geospatial-provider.cdpk](databricks-geospatial-provider.cdpk) | Checked-in provider package; not automatically rebuilt by source edits |

The main provider logic is in [model.js](providers/databricks-geospatial-provider/src/model.js). Its [modules/](providers/databricks-geospatial-provider/src/modules/) directory separates SQL generation, geometry conversion, connection pools, workspace resolution, caching, and audit logging.

### Request processing

`getData(req, callback)` routes requests with `lakebaseHost` to PostgreSQL/PostGIS; other requests go to Databricks SQL. On the SQL path, the model resolves a workspace and warehouse, validates configured identifiers, builds a query, executes it through a reusable connection, and converts rows into a GeoJSON collection with fields, extent, and spatial-reference metadata.

`editData(req, data, callback)` implements adds, updates, and deletes for Lakebase. It uses parameterized edit SQL and can wrap a batch in a transaction when `rollbackOnFailure` is set. The model also supplies `authorize` and `getMetadata` hooks to the CDF runtime.

| Module | Responsibility |
| --- | --- |
| [workspaceResolver.js](providers/databricks-geospatial-provider/src/modules/workspaceResolver.js) | INI profile parsing, credential selection, and environment fallback. |
| [connectionPool.js](providers/databricks-geospatial-provider/src/modules/connectionPool.js) | Databricks SQL pools keyed by workspace alias and warehouse HTTP path. |
| [geometryFormat.js](providers/databricks-geospatial-provider/src/modules/geometryFormat.js) | Explicit formats, name hints, and schema/sample probes. |
| [sql.js](providers/databricks-geospatial-provider/src/modules/sql.js) | Lakehouse query construction. |
| [lakebaseQuery.js](providers/databricks-geospatial-provider/src/modules/lakebaseQuery.js) | PostgreSQL/PostGIS reads. |
| [editSql.js](providers/databricks-geospatial-provider/src/modules/editSql.js) | Parameterized insert, update, and delete statements. |
| [queryCache.js](providers/databricks-geospatial-provider/src/modules/queryCache.js) | Optional in-memory response cache with TTL and entry limits. |
| [auditLog.js](providers/databricks-geospatial-provider/src/modules/auditLog.js) | Optional authentication, query, and edit audit logging. |


## Workspace credentials

Credentials are resolved by [workspaceResolver.js](providers/databricks-geospatial-provider/src/modules/workspaceResolver.js). Configure a named profile in `~/.databrickscfg`, or set `DATABRICKS_CONFIG_FILE` to another file location:

```ini
[WORKSPACE_A]
host = <workspace-hostname>
client_id = <service-principal-client-id>
client_secret = <service-principal-secret>
```

Set the service parameter `workspace` to `WORKSPACE_A` to use this profile. A profile can instead contain `host` and `token` for personal access token authentication. Do not combine token and OAuth credentials in the same profile.

When `workspace` is omitted, the resolver checks `[DEFAULT]` first, then environment variables:

| Variable | Purpose |
| --- | --- |
| `DATABRICKS_SERVER_HOSTNAME` | Workspace hostname; falls back to `DATABRICKS_HOST` |
| `DATABRICKS_CLIENT_ID`, `DATABRICKS_CLIENT_SECRET` | OAuth machine-to-machine credentials; preferred when both are set |
| `DATABRICKS_ACCESS_TOKEN` | Token fallback when OAuth credentials are unavailable |
| `DATABRICKS_HTTP_PATH` | Default SQL warehouse HTTP path |

The model also loads a local `.env` from `providers/databricks-geospatial-provider/.env`. Keep real credentials out of tracked files. Named profiles are cached in memory, so restart the process after changing the profile file. A generic [.env.example](providers/databricks-geospatial-provider/.env.example) is included as a starting point.

The provider's `DATABRICKS_CONFIG_FILE` points to an **INI** file. The companion builder uses the same variable name for its own **JSON** configuration; they are separate processes and must not share that setting blindly. A workspace ID selected in the builder must resolve to the corresponding profile on the deployed provider.

Lakebase pools obtain short-lived database credentials through the resolved Databricks workspace, using either PAT or OAuth machine-to-machine authentication for the API calls. Setting `LAKEBASE_PASSWORD` explicitly bypasses credential generation; it does not remove the model's workspace-resolution requirement.

## Service configuration

The complete parameter list is defined in the [provider manifest](providers/databricks-geospatial-provider/cdconfig.json). Connection credentials are configured separately from per-service table settings.

### Lakehouse example

This is a service-parameter fragment, not a complete ArcGIS service creation request:

```json
{
  "workspace": "WORKSPACE_A",
  "warehouseHttpPath": "/sql/1.0/warehouses/<warehouse-id>",
  "tableName": "catalog.schema.features",
  "geometryColumn": "geometry",
  "geometryFormat": "WKT",
  "idField": "id",
  "srid": "4326",
  "maxRecordCount": "2000"
}
```

Use a unique identifier column for `idField` and the source geometry's EPSG identifier for `srid`. Supported geometry format settings are `WKT`, `WKT_DECIMAL_COMMA`, `WKB`, `GEOJSON`, and `GEOMETRY`; when omitted, the resolver first checks column-name hints, then probes `DESCRIBE TABLE` and samples string geometries. The detected format is cached for the process lifetime. Set it explicitly when the schema or naming is ambiguous. Set `timeColumn` when using timestamp filtering.

### Lakebase example

```json
{
  "workspace": "WORKSPACE_A",
  "lakebaseHost": "<lakebase-hostname>",
  "lakebasePort": "5432",
  "lakebaseDatabase": "<database>",
  "lakebaseSchema": "public",
  "lakebaseTable": "features",
  "geometryColumn": "geometry",
  "idField": "id",
  "srid": "4326",
  "editingEnabled": "true"
}
```

Editing also requires the service capabilities to include `Query,Editing`. The Lakebase path requires a database and table, and defaults to port `5432` and schema `public`. Connection and credential handling are implemented in [lakebasePool.js](providers/databricks-geospatial-provider/src/modules/lakebasePool.js).

### Query tuning

- `maxRecordCount` controls the maximum features per page; the default is `2000` unless overridden by the environment.
- `enableGeometryGeneralization`, `minGeneralizationTolerance`, and `maxGeneralizationTolerance` control optional geometry simplification.
- `queryCacheEnabled` enables in-memory caching of identical Lakehouse query responses. It is disabled by default; the default TTL is `300` seconds and capacity is `500` entries, configurable with `queryCacheTtlSeconds` and `queryCacheMaxEntries`. The model excludes metadata, counts, IDs, distinct-value queries, attribute-only responses, and empty geometry results from this cache.

## Local development

Use Node.js and npm compatible with the dependencies and your target CDF runtime. This folder contains separate npm packages: installing dependencies at the application root does not install the provider or bundled framework packages.

For provider development, run from the repository root:

```powershell
cd databricks-provider/providers/databricks-geospatial-provider
npm ci
```

To install the local application's separate packages, run from `databricks-provider`:

```powershell
npm install
npm install --prefix providers/databricks-geospatial-provider
Get-ChildItem framework -Directory | ForEach-Object {
    if (Test-Path (Join-Path $_.FullName 'package.json')) {
        npm install --prefix $_.FullName
    }
}
```

Then start the application from the same folder:

```powershell
npm start
```

The server defaults to `http://localhost:8080`; `/status` reports server health. Override the port with `npm start -- --port 8081`. Service parameters are passed by the request middleware through the `x-esri-cdf-service-params` JSON header; see [extract-service-parameters.js](src/extract-service-parameters.js).

The provider's authorization checks are disabled unless `ENABLE_USER_AUTH` or `ENABLE_SIMPLE_AUTH` is `true`. `ENABLE_USER_AUTH` checks the ArcGIS user identity supplied to the runtime. Simple authentication uses `SIMPLE_AUTH_TOKEN` and is intended for testing. `ENABLE_AUDIT_LOG=true` enables audit logging.

## Tests and current caveats

Provider tests are in [test/](providers/databricks-geospatial-provider/test/) and cover SQL, filters, geometry, caching, workspace resolution, connection pools, and model behavior. From the provider directory, run:

```powershell
npx mocha "test/**/*.test.js"
```

Some tests require `proxyquire`, which is currently missing from the provider's declared development dependencies. If it cannot be resolved locally, install it without changing the manifest or lockfile before running the suite:

```powershell
npm install --no-save --package-lock=false proxyquire
```

The application's root `npm test` targets `test/**/*.test.js`, while its checked-in application tests are under `src/*.spec.js`. The provider's `test-local.js` is a separate live-data example with placeholder table settings; it also uses an older promise-style call, while the current `getData` method expects a callback. It also calls `model.close()`, which the current model does not implement. Adapt it before using it as an integration check.

This README was checked against the application entry point, provider model, manifests, credential resolver, pooling, geometry, caching, and editing modules. No live Databricks, Lakebase, or ArcGIS service was contacted for this documentation update, and the test suite was not run.

## Related material

- [Lakebase and Databricks comparison](providers/databricks-geospatial-provider/LAKEBASE-vs-DATABRICKS.md)
- [Multi-workspace design notes](providers/databricks-geospatial-provider/MULTI_WORKSPACE_PLAN.md)
- [Databricks Builder](../databricks-builder/README.md), a separate application in this repository

The design notes provide background; use the current source and provider manifest as the reference for implemented behavior.
