# DuckDB taxi origin-destination lines

A CDF example that turns taxi trip endpoints into straight origin-destination lines. It exposes those lines and trip attributes through a FeatureServer and provides a browser map with taxi and date filters.

## How it works

The constructor reads Parquet into an in-memory table, converts endpoint WKT with `ST_GeomFromText`, joins endpoints with `ST_MakeLine`, and creates integer object IDs. Rows with null endpoints are excluded. Query handling uses the shared SQL builder and awaits the metadata extent query before returning features.

The manifests target **ArcGIS 11.4.0**. The CDF provider is `duckdb-provider-od-cu2025` and the configured source ID is `localParquet`.

## Input and output

A **single Parquet file** containing `taxi_id`, `trajectory_id`, `timestamp`, `source_point`, and `target_point`. Both points must contain WKT in the assumed EPSG:4326 source coordinates.

Output fields include string `taxi_id`, string `trajectory_id`, `timestamp`, `distance_meters`, the configured object ID, and line geometry. `distance_meters` is computed from the straight line transformed to EPSG:3857; it is a projected distance, not a driven route length or geodesic distance.

The checked-in package is named `duckdb-provider-gps-cu2025.cdpk`, while the source provider is `duckdb-provider-od-cu2025`. Do not infer its contents from this filename or assume it is an up-to-date OD build.

## Configuration

Edit [providers/duckdb-od-cu2025/config/default.json](providers/duckdb-od-cu2025/config/default.json), particularly `duckdb.sources.localParquet`:

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
npm install --prefix providers/duckdb-od-cu2025
Get-ChildItem framework -Directory | ForEach-Object {
    if (Test-Path (Join-Path $_.FullName 'package.json')) {
        npm install --prefix $_.FullName
    }
}
```

Supply the required dataset before starting. DuckDB runs `INSTALL`/`LOAD` for its extensions during initialization, so those extensions must be available in the runtime environment.

```powershell
node src/index.js --port 8082
```

The `npm start` script references `nodemon`, which is not declared as a dependency. The direct Node command above avoids that missing executable.

The frontend uses this layer URL:

```text
http://127.0.0.1:8082/duckdb-provider-od-cu2025/rest/services/localParquet/FeatureServer/0
```

For a small query, append `/query?where=1%3D1&outFields=*&resultRecordCount=10&f=json`. Check both returned attributes and geometry against the source.

## Browser example

Displays straight trip lines. Taxi ID and date inputs build a `definitionExpression`; the start date is inclusive and the end date is exclusive. The layer is added when the filter button is first used.

See [frontend/README.md](frontend/README.md) for the local static-server command. The page uses ArcGIS Maps SDK for JavaScript 4.30 from the CDN and a hardcoded local service URL.

## Code map

| Path | Responsibility |
| --- | --- |
| [Provider model](providers/duckdb-od-cu2025/src/model.js) | Source loading and request processing. |
| [Provider modules](providers/duckdb-od-cu2025/src/modules/) | SQL, spatial filtering, configuration checks, and GeoJSON conversion. |
| [Provider manifest](providers/duckdb-od-cu2025/cdconfig.json) | Provider name and route options. |
| [src/](src/) | Local CDF server startup and provider registration. |
| [framework/](framework/) | Bundled CDF and FeatureServer implementation. |
| [frontend/index.html](frontend/index.html) | Standalone demonstration map. |

## Validation and current limits

The SQL builder includes branches for `where`, object IDs, output fields, ordering, counts, distinct values, limits, offsets, and spatial filters. Its spatial-filter branch is skipped when neither `where` nor `objectIds` is supplied; use `where=1=1` when exercising spatial queries. SQL fragments are interpolated, so this demo is not a validated boundary for arbitrary untrusted query input.

The provider's [tests](providers/duckdb-od-cu2025/test/) are scaffold tests: `model.test.js` calls `getData` with an empty request and checks only the collection shape. They do not establish correct SQL, filtering, or dataset output. Run provider tests from `providers/duckdb-od-cu2025` with `npm test` after installing dependencies; the application-root test script points to a root `test` folder that is not present.

This documentation is based on source review. No live data or ArcGIS deployment was exercised during the documentation update.

## Development approach

All custom adaptations and additions in this project were created through **vibe coding with OpenAI Codex**, guided through prompts, feedback, and iteration. Upstream code, bundled frameworks, generated scaffolding, and dependencies retain their original authorship and licenses. See the [repository overview](../README.md).
