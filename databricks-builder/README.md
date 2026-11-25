# Databricks Spatial Service Builder for ArcGIS

A companion application for configuring and publishing CDF feature services backed by Databricks spatial tables. It provides a React/Calcite wizard, an Express API, and shared TypeScript types. The [Databricks provider](../databricks-provider/README.md) must be deployed separately; the builder does not run the feature-service data path or upload provider packages.

## What the code implements

The wizard signs into ArcGIS Portal, selects a configured workspace and warehouse, browses catalogs/schemas/tables, detects candidate geometry and identifier fields, builds service settings, validates them, and submits a publish request. The UI includes Spanish and Catalan translations and stores the language preference in browser local storage.

The backend implements:

- Catalog, schema, and table browsing through Databricks SQL.
- Schema inspection and sampling, with sample size capped at 100 rows (default 20).
- Geometry detection for native types, WKT, decimal-comma WKT, WKB, and GeoJSON, based on column metadata and sampled values.
- Object ID candidate checks using total, non-null, and distinct counts; by default it checks up to 10 candidates, capped at 20.
- Schema-level geometry scans with a local disk cache.
- CDF service-parameter generation, optional Lakebase editing settings, query-cache settings, and geometry-generalization controls.
- ArcGIS service creation and an optional move of the returned Portal item into a selected folder.

## How the components connect

The browser calls the Express API for metadata and configuration operations. The API opens Databricks SQL connections using a token named in the workspace configuration. The browser's Portal token is sent to the backend for publishing and folder operations. After publication, ArcGIS Server and the separately installed provider handle feature queries.

The builder's Databricks credentials are independent of the provider's credentials. Metadata is browsed with the backend's configured principal, not automatically with the signed-in Portal user's Databricks identity.

## Folder guide

| Path | Responsibility |
| --- | --- |
| [frontend/src/App.tsx](frontend/src/App.tsx) | Wizard state, browsing, field selection, validation, and publishing UI. |
| [frontend/src/services/](frontend/src/services/) | API requests and popup-based Portal OAuth. |
| [frontend/src/i18n/](frontend/src/i18n/) | Spanish and Catalan text. |
| [frontend/public/oauth-callback.html](frontend/public/oauth-callback.html) | Receives the OAuth redirect for the popup flow. |
| [frontend/vite.config.ts](frontend/vite.config.ts) | API proxy and local Calcite asset serving/copying. |
| [backend/src/config/](backend/src/config/) | Environment parsing and JSON workspace profiles. |
| [backend/src/databricks/](backend/src/databricks/) | SQL client, metadata operations, identifier checks, and geometry-scan cache. |
| [backend/src/detection/](backend/src/detection/) | Geometry/time-field suggestions and Object ID validation. |
| [backend/src/arcgis/](backend/src/arcgis/) | Service-parameter construction and ArcGIS publishing. |
| [backend/src/routes/](backend/src/routes/) | HTTP endpoint definitions. |
| [backend/tests/](backend/tests/) | Detection and service-parameter unit tests. |
| [shared/src/index.ts](shared/src/index.ts) | Shared request, configuration, and response types. |

## Local configuration

Run from this folder:

```powershell
npm install
Copy-Item .env.example .env
```

Use [databricks.workspaces.example.json](databricks.workspaces.example.json) as the shape for your local workspace configuration. The checked-in `databricks.workspaces.json` contains generic placeholders and will not connect until configured.

The backend reads `.env` in its working directory and the parent directory. Vite reads environment variables from the project root (`envDir: ".."`).

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend port, default `4000`. |
| `PORTAL_URL` | Backend Portal URL; defaults to ArcGIS Online. Set your intended Enterprise Portal for this workflow. |
| `ARCGIS_SERVER_ADMIN_URL` | Target server admin root, such as `https://server.example.com/arcgis/admin`. Required for publication. |
| `CDF_PROVIDER_NAME` | Registered provider name, default `databricks-geospatial-provider`. |
| `DATABRICKS_CONFIG_FILE` | Builder workspace **JSON** file, default `./databricks.workspaces.json`. |
| `APP_BASE_URL` | Allowed browser origin for CORS, default `http://localhost:5173`. |
| `VITE_PORTAL_URL` | Portal URL used by the frontend. |
| `VITE_ARCGIS_CLIENT_ID` | OAuth application ID used by the frontend sign-in code. |
| `VITE_API_BASE_URL` | Optional frontend API base; leave empty for the Vite proxy. |

`ARCGIS_CLIENT_ID` is parsed by the backend, but does not replace `VITE_ARCGIS_CLIENT_ID` in the browser code. Register the actual frontend origin plus `/oauth-callback.html` as the callback URL for your Portal application. The current code uses a popup with `response_type=token` and validates OAuth state.

A workspace profile has this shape:

```json
[
  {
    "id": "default",
    "label": "Example workspace",
    "host": "workspace.example.com",
    "tokenEnv": "DATABRICKS_ACCESS_TOKEN",
    "warehouses": [
      {
        "id": "main",
        "name": "Main SQL warehouse",
        "httpPath": "/sql/1.0/warehouses/0000000000000000"
      }
    ]
  }
]
```

Set the named token variable in the backend environment or local `.env`; do not put a token value into the workspace JSON. The metadata client currently uses token authentication, while the separate provider also supports OAuth machine-to-machine credentials.

The selected workspace `id` is emitted as the provider's `workspace` parameter. Configure a matching provider-side INI profile, or use its default profile/environment fallback. The two applications use `DATABRICKS_CONFIG_FILE` for different file formats and should be configured independently.

## Run, build, and test

```powershell
npm run build -w shared
npm run dev
```

Vite normally serves the browser at `http://localhost:5173`, with `/api` proxied to `http://127.0.0.1:4000`. Use an origin matching `APP_BASE_URL`; update the Vite proxy if you change the backend port. The API health endpoint is `/api/health`.

```powershell
npm test
npm run build
```

The root build script builds `shared`, then the backend, then the frontend. Backend output goes to `backend/dist`, frontend output to `frontend/dist`. `npm run start -w backend` starts only the compiled API; it does not host the frontend. The Vite plugin copies Calcite assets into the frontend build.

## API reference

For Databricks routes below, `D` means `/api/databricks/:workspace/:warehouse`.

| Method and route | Behavior |
| --- | --- |
| `GET /api/health` | API health response. |
| `GET /api/workspaces` | Workspace IDs, labels, and hosts. |
| `GET /api/workspaces/:workspace/warehouses` | Configured warehouse choices. |
| `GET D/catalogs` | Lists catalogs. |
| `GET D/catalogs/:catalog/schemas` | Lists schemas. |
| `GET D/catalogs/:catalog/schemas/:schema/tables` | Lists tables. |
| `GET D/catalogs/:catalog/schemas/:schema/geometry-scan` | Reads a cached scan or returns null. |
| `POST D/catalogs/:catalog/schemas/:schema/geometry-scan` | Scans tables; accepts optional `tableNames` and `forceRefresh`. |
| `GET D/table/describe?tableName=...` | Returns column descriptions. |
| `GET D/table/sample?tableName=...&limit=20` | Returns sampled data rows. |
| `POST D/table/detect` | Accepts `tableName`; suggests geometry, ID, and time settings. |
| `POST D/table/find-object-id` | Accepts `tableName` and optional `maxCandidates`; checks identifier candidates. |
| `POST /api/arcgis/validate-service` | Validates `{ config }` and previews parameters. |
| `POST /api/arcgis/publish-service` | Accepts `{ config, portalToken, portalUrl? }` and creates a service. |
| `POST /api/arcgis/folders` | Accepts `{ portalToken, portalUrl? }` and lists Portal folders. |

## Publication behavior

[publisher.ts](backend/src/arcgis/publisher.ts) posts a `CUSTOMDATA` FeatureServer definition to `{ARCGIS_SERVER_ADMIN_URL}/services/createService`. It embeds the selected provider and settings under `jsonProperties.customDataProviderInfo`, sets `Query` or `Query,Editing`, disables service caching, and sets `forwardUserIdentity: false`.

A leading `databricks_` prefix is removed from the service name. If ArcGIS returns an `itemId` and a folder was selected, the code attempts to move that item. A failed move becomes a warning; it does not undo the created service. Item and Map Viewer links depend on an `itemId` being returned. The builder does not explicitly create a Portal item when one is absent.

The builder enables geometry generalization unless disabled, supplies a maximum tolerance of `0.001` for SRID 4326 when none is set, and disables provider query caching unless selected. Advanced parameters are merged last and can override generated settings.

## Current limits

- Detection uses metadata and samples; it is a suggestion, not validation of every geometry. Object ID checks scan the current table for uniqueness and nulls but do not prove long-term stability or runtime compatibility of every ID type.
- Geometry scans are saved under `backend/.cache/geometry-scans`. Cache entries have no expiry; use `forceRefresh` after source changes. The cache key covers workspace, warehouse, catalog, and schema, but not a requested subset of table names.
- Databricks tokens stay on the backend, but sampled source rows and metadata are returned to the browser. The Express server does not install authentication middleware on metadata routes; Portal sign-in in the UI is not API authorization.
- Publication passes the supplied Portal token to the configured server admin endpoint. The deployment must accept that token and grant the caller the required permissions. The publish route builds parameters but does not call the full `validateServiceConfiguration` function before sending the request.
- The generated service disables user-identity forwarding. Enabling `ENABLE_USER_AUTH` in the provider requires a corresponding service configuration change.

This documentation was reviewed against the routes, wizard, SQL client, detection, cache, and publisher code. Unit tests cover detection and parameter generation; they do not establish successful live publication. No tests, external queries, or publishing operations were run for this documentation update.

## Development approach

All custom adaptations and additions were created through **vibe coding with OpenAI Codex**, guided through prompts, feedback, and iteration. Upstream code, bundled components, and third-party dependencies retain their original authorship and licenses. See the [repository overview](../README.md).
