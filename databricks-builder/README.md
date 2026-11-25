# Databricks Spatial Service Builder for ArcGIS

A companion publishing and configuration app for ArcGIS Custom Data Feed Feature Services backed by Databricks spatial tables.

The existing CDF provider remains deployed separately in ArcGIS Server. This app helps Portal users sign in, browse governed Databricks metadata, detect spatial fields, validate service parameters, and publish a Feature Service without manually typing the internal CDF parameter model.

## What Is Included

- React + TypeScript frontend using Esri Calcite components.
- Node.js + Express + TypeScript backend.
- Databricks SQL metadata browsing through `@databricks/sql`.
- ArcGIS Portal OAuth sign-in from the frontend.
- Backend-only Databricks token handling.
- Detection logic for native geometry, WKT, WKB, GeoJSON, decimal-comma WKT, object id fields, and time fields.
- ArcGIS validation and publish endpoints that generate `serviceParameters`.
- Tests for detection logic and CDF parameter generation.

## Project Layout

```text
frontend/
  src/components
  src/services
  src/types
backend/
  src/routes
  src/services
  src/databricks
  src/arcgis
  src/detection
  src/config
shared/
  src
```

## Setup

Install dependencies from this folder:

```powershell
npm install
```

Create environment files:

```powershell
Copy-Item .env.example .env
Copy-Item databricks.workspaces.example.json databricks.workspaces.json
```

Set the required values in `.env`:

```text
PORTAL_URL=https://your-portal.example.com/portal
ARCGIS_CLIENT_ID=your-oauth-app-id
ARCGIS_SERVER_ADMIN_URL=https://your-server.example.com/arcgis/admin
CDF_PROVIDER_NAME=databricks-geospatial-provider
DATABRICKS_CONFIG_FILE=./databricks.workspaces.json
APP_BASE_URL=http://localhost:5173
PORT=4000
```

For the frontend OAuth client, also set Vite variables when needed:

```text
VITE_PORTAL_URL=https://your-portal.example.com/portal
VITE_ARCGIS_CLIENT_ID=your-oauth-app-id
VITE_API_BASE_URL=
```

## Databricks Workspace Config

Databricks tokens are never sent to the frontend. Each workspace profile names the environment variable that contains its token:

```json
[
  {
    "id": "prod",
    "label": "Production workspace",
    "host": "adb-0000000000000000.0.azuredatabricks.net",
    "tokenEnv": "DATABRICKS_PROD_TOKEN",
    "warehouses": [
      {
        "id": "main",
        "name": "Main SQL Warehouse",
        "httpPath": "/sql/1.0/warehouses/0000000000000000"
      }
    ]
  }
]
```

Then set the token in the server environment:

```powershell
$env:DATABRICKS_PROD_TOKEN="dap..."
```

If metadata browsing returns `403 Forbidden`, the backend reached Databricks but the SQL warehouse request was rejected. Check the token value, SQL warehouse `CAN USE` permission for the token principal, workspace network/IP access rules, and Unity Catalog permissions such as `USE CATALOG`, `USE SCHEMA`, and `SELECT` on the target table.

## Development

Run the API and frontend together:

```powershell
npm run dev
```

The frontend runs at `http://127.0.0.1:5173` and proxies `/api` calls to the backend at `http://127.0.0.1:4000`.

Run tests:

```powershell
npm test
```

Build everything:

```powershell
npm run build
```

## API Surface

- `GET /api/workspaces`
- `GET /api/workspaces/:workspace/warehouses`
- `GET /api/databricks/:workspace/:warehouse/catalogs`
- `GET /api/databricks/:workspace/:warehouse/catalogs/:catalog/schemas`
- `GET /api/databricks/:workspace/:warehouse/catalogs/:catalog/schemas/:schema/tables`
- `GET /api/databricks/:workspace/:warehouse/table/describe?tableName=`
- `GET /api/databricks/:workspace/:warehouse/table/sample?tableName=&limit=20`
- `POST /api/databricks/:workspace/:warehouse/table/detect`
- `POST /api/arcgis/validate-service`
- `POST /api/arcgis/publish-service`

## Generated CDF Parameters

The backend generates the standard CDF `serviceParameters` object:

```json
{
  "workspace": "prod",
  "warehouseHttpPath": "/sql/1.0/warehouses/...",
  "tableName": "catalog.schema.table",
  "geometryColumn": "geom",
  "idField": "objectid",
  "geometryFormat": "GEOMETRY",
  "srid": "4326",
  "maxRecordCount": "2000",
  "timeColumn": "updated_at"
}
```

Editable services also include Lakebase values and `editingEnabled: "true"`.

## Security Notes

- Databricks credentials are loaded only in the backend.
- The frontend receives workspace and warehouse metadata, not tokens.
- SQL identifiers are validated before being used in generated Databricks metadata queries.
- The backend exposes only metadata, sampling, detection, validation, and publish operations.
- Manual mode exists as an escape hatch, but table and column identifiers are still validated server-side.

## ArcGIS Publishing

`POST /api/arcgis/publish-service` currently posts generated CDF parameters to:

```text
{ARCGIS_SERVER_ADMIN_URL}/services/createService
```

If your ArcGIS Server CDF publishing endpoint differs, adjust `backend/src/arcgis/publisher.ts` to match the exact REST/Admin operation used by your deployment. The rest of the app keeps the provider-specific payload isolated behind `buildServiceParameters`.
