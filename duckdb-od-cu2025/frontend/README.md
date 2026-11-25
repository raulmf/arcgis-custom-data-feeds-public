# DuckDB taxi origin-destination lines: browser example

Displays straight trip lines. Taxi ID and date inputs build a `definitionExpression`; the start date is inclusive and the end date is exclusive. The layer is added when the filter button is first used.

## Run

Start the CDF application as described in the [project README](../README.md). From this `frontend` folder, serve the static page with Python:

```powershell
python -m http.server 5500 --bind 127.0.0.1
```

Open `http://127.0.0.1:5500`. No frontend build or npm install is required. Internet access is needed for the ArcGIS JavaScript 4.30 CDN and basemap resources.

The layer URL in [index.html](index.html) is `http://127.0.0.1:8082/duckdb-provider-od-cu2025/rest/services/localParquet/FeatureServer/0`. Update it if the backend host, port, or provider route changes. A local HTTP backend should be tested from an HTTP page rather than an HTTPS page that would block mixed content.

For schema, configuration, and implementation limits, see the [project README](../README.md).
