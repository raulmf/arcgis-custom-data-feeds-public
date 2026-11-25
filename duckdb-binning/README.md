# DuckDB Parquet provider and taxi map

Loads spatial Parquet partitions into an in-memory DuckDB table and exposes them through a CDF feature service. The browser example displays NYC taxi points and applies pickup-time and passenger-count filters. Despite the folder name, the current frontend does not configure feature binning, and the model does not aggregate into bins.

## How it works

The constructor loads the DuckDB spatial extension, reads `path/*.parquet`, converts the configured WKB column to geometry, and generates integer object IDs with `row_number()`. Each request selects a source using `req.params.id`; the SQL helper translates query parameters and the translator returns a GeoJSON feature collection.

The manifests target **ArcGIS 11.4.0**. The CDF provider is `duckdb-provider` and the configured source ID is `localParquet`.

## Input and output

A **directory of Parquet partitions** with a binary geometry column named by `WKBColumn` (default `WKB`). Other attributes are retained. The browser expects `passenger_count`, `trip_distance`, `tpep_pickup_datetime`, `tpep_dropoff_datetime`, and `fare_amount`.

The model also contains optional MinIO/S3 and Azure Delta loading branches. Only local Parquet is configured by default. MinIO uses `httpfs` and currently sets `s3_use_ssl = false`. The Delta validator incorrectly accesses `sources.deltaRequiredFields`, so that branch needs correction before use.

The [data notes](providers/duckdb-provider/data/README.md) describe a public NYC taxi sample. The configured description says ten million points, while the locally reviewed Parquet sample had one million rows; neither description should be treated as a dataset-size guarantee.

## Configuration

Edit [providers/duckdb-provider/config/default.json](providers/duckdb-provider/config/default.json), particularly `duckdb.sources.localParquet`:

| Setting | Role |
| --- | --- |
| `path` | Your local Parquet directory; replace the checked-in machine-specific path. |
| `properties.name` | DuckDB table name and layer name. |
| `geomOutColumn` | Geometry column created by the model; default `geometry`. |
| `idField` | Generated object ID column; default `OBJECTID`. |
| `dbWKID` | Spatial reference metadata; default `4326`. |
| `maxRecordCountPerPage` | Advertised page size; default `10000`. |
| `WKBColumn` | Required by the shared validator and used for geometry conversion. |

The startup importer copies provider settings into the application's `config/default.json`. Edit the provider configuration as well as any application copy; changes made only to the application copy can be overwritten. All tables are loaded into memory at startup, so source file changes require a restart and the dataset must fit available memory.

## Run locally

Install dependencies from this project folder. The application, provider, and framework folders are separate npm packages:

```powershell
npm install
npm install --prefix providers/duckdb-provider
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
http://127.0.0.1:8080/duckdb-provider/rest/services/localParquet/FeatureServer/0
```

For a small query, append `/query?where=1%3D1&outFields=*&resultRecordCount=10&f=json`. Check both returned attributes and geometry against the source.

## Browser example

Filters `tpep_pickup_datetime` by a text prefix and `passenger_count` by equality, shows matching counts, and opens attribute popups. There is no current `featureReduction` configuration.

See [frontend/README.md](frontend/README.md) for the local static-server command. The page uses ArcGIS Maps SDK for JavaScript 4.30 from the CDN and a hardcoded local service URL.

## Code map

| Path | Responsibility |
| --- | --- |
| [Provider model](providers/duckdb-provider/src/model.js) | Source loading and request processing. |
| [Provider modules](providers/duckdb-provider/src/modules/) | SQL, spatial filtering, configuration checks, and GeoJSON conversion. |
| [Provider manifest](providers/duckdb-provider/cdconfig.json) | Provider name and route options. |
| [src/](src/) | Local CDF server startup and provider registration. |
| [framework/](framework/) | Bundled CDF and FeatureServer implementation. |
| [frontend/index.html](frontend/index.html) | Standalone demonstration map. |

## Validation and current limits

The SQL builder includes branches for `where`, object IDs, output fields, ordering, counts, distinct values, limits, offsets, and spatial filters. Its spatial-filter branch is skipped when neither `where` nor `objectIds` is supplied; use `where=1=1` when exercising spatial queries. SQL fragments are interpolated, so this demo is not a validated boundary for arbitrary untrusted query input.

Initialization and query error callbacks can continue after logging an error, and metadata extent retrieval is not explicitly awaited. A returned empty feature collection is not sufficient evidence of a successful source query.

The provider's [tests](providers/duckdb-provider/test/) are scaffold tests: `model.test.js` calls `getData` with an empty request and checks only the collection shape. They do not establish correct SQL, filtering, or dataset output. Run provider tests from `providers/duckdb-provider` with `npm test` after installing dependencies; the application-root test script points to a root `test` folder that is not present.

This documentation is based on source review. No live data or ArcGIS deployment was exercised during the documentation update.

## Development approach

All custom adaptations and additions in this project were created through **vibe coding with OpenAI Codex**, guided through prompts, feedback, and iteration. Upstream code, bundled frameworks, generated scaffolding, and dependencies retain their original authorship and licenses. See the [repository overview](../README.md).
