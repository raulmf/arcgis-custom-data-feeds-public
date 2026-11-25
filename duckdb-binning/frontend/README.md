# DuckDB Parquet provider and taxi map: browser example

Filters `tpep_pickup_datetime` by a text prefix and `passenger_count` by equality, shows matching counts, and opens attribute popups. There is no current `featureReduction` configuration.

## Run

Start the CDF application as described in the [project README](../README.md). From this `frontend` folder, serve the static page with Python:

```powershell
python -m http.server 5500 --bind 127.0.0.1
```

Open `http://127.0.0.1:5500`. No frontend build or npm install is required. Internet access is needed for the ArcGIS JavaScript 4.30 CDN and basemap resources.

The layer URL in [index.html](index.html) is `http://127.0.0.1:8080/duckdb-provider/rest/services/localParquet/FeatureServer/0`. Update it if the backend host, port, or provider route changes. A local HTTP backend should be tested from an HTTP page rather than an HTTPS page that would block mixed content.

For schema, configuration, and implementation limits, see the [project README](../README.md).
