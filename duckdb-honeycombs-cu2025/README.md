# DuckDB H3 taxi honeycombs

Aggregates taxi pickup points into H3 hexagonal cells in DuckDB and returns polygon features with a `point_count` attribute. A browser map colors cells by their counts and can restrict the aggregation to one taxi.

## How it works

Startup loads `spatial` and the community `h3` extension and materializes pickup points in memory. Each request maps points to H3 cells with `h3_latlng_to_cell`, groups by cell, counts points, and converts cell boundary WKT to GeoJSON polygons.

The manifests target **ArcGIS 11.4.0**. The CDF provider is `duckdb-provider-honeycombs-cu2025` and the configured source ID is `localParquet`.

## Input and output

A **single Parquet file** containing `taxi_id`, `timestamp`, and `source_point` in WKT. H3 uses the point latitude and longitude, so the expected coordinates are EPSG:4326.

The query accepts `h3res` (default `9`) and optional `taxi_id`. Results contain `OBJECTID`, `point_count`, and polygon geometry. The provider sets a `ttl` hint of 3600 seconds.

This model bypasses `buildSqlQuery`: its SQL does not apply ordinary `where`, extent, offset, or page-size parameters. Although it computes `fetchSize` and reports filter metadata, those do not add SQL filtering. The `returnCountOnly` branch looks for `count(1)`, which the aggregation does not select, so it cannot provide a correct count through that branch. `h3res` is interpolated without numeric validation.

The frontend initially requests resolution 8, but every branch of its scale watcher selects 9. It does not currently vary resolution across zoom levels. Object IDs are regenerated for each aggregation and are not stable cell identifiers. The provider package manifest still uses the GPS provider name; routing uses the honeycomb name from `cdconfig.json`.

## Configuration

Edit [providers/duckdb-honeycombs-cu2025/config/default.json](providers/duckdb-honeycombs-cu2025/config/default.json), particularly `duckdb.sources.localParquet`:

| Setting | Role |
| --- | --- |
| `path` | Your local Parquet file; replace the checked-in machine-specific path. |
| `properties.name` | DuckDB table name and layer name. |
| `geomOutColumn` | Geometry column created by the model; default `geometry`. |
| `idField` | Generated object ID column; default `OBJECTID`. |
| `dbWKID` | Spatial reference metadata; default `4326`. |
| `maxRecordCountPerPage` | Advertised page size; default `10000`. |
| `WKBColumn` | Required by the shared validator, although this model reads WKT from source_point. |

The startup importer copies provider settings into the application's `config/default.json`. Edit the provider configuration as well as any application copy; changes made only to the application copy can be overwritten. All tables are loaded into memory at startup, so source file changes require a restart and the dataset must fit available memory.

## Run locally

Install dependencies from this project folder. The application, provider, and framework folders are separate npm packages:

```powershell
npm install
npm install --prefix providers/duckdb-honeycombs-cu2025
Get-ChildItem framework -Directory | ForEach-Object {
    if (Test-Path (Join-Path $_.FullName 'package.json')) {
        npm install --prefix $_.FullName
    }
}
```

Supply the required dataset before starting. DuckDB runs `INSTALL`/`LOAD` for its extensions during initialization, so those extensions must be available in the runtime environment.

```powershell
node src/index.js --port 8081
```

The `npm start` script references `nodemon`, which is not declared as a dependency. The direct Node command above avoids that missing executable.

The frontend uses this layer URL:

```text
http://127.0.0.1:8081/duckdb-provider-honeycombs-cu2025/rest/services/localParquet/FeatureServer/0
```

For a small query, append `/query?where=1%3D1&outFields=*&resultRecordCount=10&f=json`. The honeycomb SQL currently ignores that record limit.

## Browser example

Uses a polygon color ramp on `point_count` and passes `taxi_id` and `h3res` as custom request parameters. Its current scale watcher always selects resolution 9 after starting at 8.

See [frontend/README.md](frontend/README.md) for the local static-server command. The page uses ArcGIS Maps SDK for JavaScript 4.30 from the CDN and a hardcoded local service URL.

## Code map

| Path | Responsibility |
| --- | --- |
| [Provider model](providers/duckdb-honeycombs-cu2025/src/model.js) | Source loading and request processing. |
| [Provider modules](providers/duckdb-honeycombs-cu2025/src/modules/) | SQL, spatial filtering, configuration checks, and GeoJSON conversion. |
| [Provider manifest](providers/duckdb-honeycombs-cu2025/cdconfig.json) | Provider name and route options. |
| [src/](src/) | Local CDF server startup and provider registration. |
| [framework/](framework/) | Bundled CDF and FeatureServer implementation. |
| [frontend/index.html](frontend/index.html) | Standalone demonstration map. |

## Validation and current limits


The provider's [tests](providers/duckdb-honeycombs-cu2025/test/) are scaffold tests: `model.test.js` calls `getData` with an empty request and checks only the collection shape. They do not establish correct SQL, filtering, or dataset output. Run provider tests from `providers/duckdb-honeycombs-cu2025` with `npm test` after installing dependencies; the application-root test script points to a root `test` folder that is not present.

This documentation is based on source review. No live data or ArcGIS deployment was exercised during the documentation update.

## Development approach

All custom adaptations and additions in this project were created through **vibe coding with OpenAI Codex**, guided through prompts, feedback, and iteration. Upstream code, bundled frameworks, generated scaffolding, and dependencies retain their original authorship and licenses. See the [repository overview](../README.md).
