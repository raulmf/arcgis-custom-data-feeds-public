# DuckDB taxi pickup points

A CDF example that exposes taxi pickup points from a Porto trip Parquet file. DuckDB converts WKT pickup locations to geometry; the browser displays the points and filters by taxi identifier.

## How it works

At startup, the model creates an in-memory table containing a string `taxi_id`, `timestamp`, geometry parsed from `source_point`, and generated integer object IDs. Queries use the shared SQL builder; returned geometry is serialized as GeoJSON and wrapped with layer metadata.

The manifests target **ArcGIS 11.4.0**. The CDF provider is `duckdb-provider-gps-cu2025` and the configured source ID is `localParquet`.

## Input and output

A **single Parquet file** containing `taxi_id`, `timestamp`, and `source_point`. `source_point` must be WKT such as `POINT(-8.62 41.15)`. The default spatial reference is EPSG:4326.

The application manifest still names `duckdb-honeycombs-cu2025`, while the registered provider name is `duckdb-provider-gps-cu2025`. The provider directory is named `duckdb-puntos-cu2025`; these names are distinct in the current checkout. The model reads WKT from `source_point` even though the shared configuration validator still requires a `WKBColumn` entry.

## Configuration

Edit [providers/duckdb-puntos-cu2025/config/default.json](providers/duckdb-puntos-cu2025/config/default.json), particularly `duckdb.sources.localParquet`:

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
npm install --prefix providers/duckdb-puntos-cu2025
Get-ChildItem framework -Directory | ForEach-Object {
    if (Test-Path (Join-Path $_.FullName 'package.json')) {
        npm install --prefix $_.FullName
    }
}
```

Supply the required dataset before starting. DuckDB runs `INSTALL`/`LOAD` for its extensions during initialization, so those extensions must be available in the runtime environment.

```powershell
node src/index.js --port 8080
```

`npm start` runs the same application entry point.

The frontend uses this layer URL:

```text
http://127.0.0.1:8080/duckdb-provider-gps-cu2025/rest/services/localParquet/FeatureServer/0
```

For a small query, append `/query?where=1%3D1&outFields=*&resultRecordCount=10&f=json`. Check both returned attributes and geometry against the source.

## Browser example

Displays pickup points, taxi/timestamp popups, a taxi-ID filter, and a matching-feature count.

See [frontend/README.md](frontend/README.md) for the local static-server command. The page uses ArcGIS Maps SDK for JavaScript 4.30 from the CDN and a hardcoded local service URL.

## Code map

| Path | Responsibility |
| --- | --- |
| [Provider model](providers/duckdb-puntos-cu2025/src/model.js) | Source loading and request processing. |
| [Provider modules](providers/duckdb-puntos-cu2025/src/modules/) | SQL, spatial filtering, configuration checks, and GeoJSON conversion. |
| [Provider manifest](providers/duckdb-puntos-cu2025/cdconfig.json) | Provider name and route options. |
| [src/](src/) | Local CDF server startup and provider registration. |
| [framework/](framework/) | Bundled CDF and FeatureServer implementation. |
| [frontend/index.html](frontend/index.html) | Standalone demonstration map. |

## Validation and current limits

The SQL builder includes branches for `where`, object IDs, output fields, ordering, counts, distinct values, limits, offsets, and spatial filters. Its spatial-filter branch is skipped when neither `where` nor `objectIds` is supplied; use `where=1=1` when exercising spatial queries. SQL fragments are interpolated, so this demo is not a validated boundary for arbitrary untrusted query input.

Initialization and query error callbacks can continue after logging an error, and metadata extent retrieval is not explicitly awaited. A returned empty feature collection is not sufficient evidence of a successful source query.

The provider's [tests](providers/duckdb-puntos-cu2025/test/) are scaffold tests: `model.test.js` calls `getData` with an empty request and checks only the collection shape. They do not establish correct SQL, filtering, or dataset output. Run provider tests from `providers/duckdb-puntos-cu2025` with `npm test` after installing dependencies; the application-root test script points to a root `test` folder that is not present.

This documentation is based on source review. No live data or ArcGIS deployment was exercised during the documentation update.

## Development approach

All custom adaptations and additions in this project were created through **vibe coding with OpenAI Codex**, guided through prompts, feedback, and iteration. Upstream code, bundled frameworks, generated scaffolding, and dependencies retain their original authorship and licenses. See the [repository overview](../README.md).
