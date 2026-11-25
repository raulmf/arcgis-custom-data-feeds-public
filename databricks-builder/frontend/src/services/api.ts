import type {
  ColumnDescription,
  DetectionResult,
  GeometryTableScanResult,
  ObjectIdSearchResult,
  PortalFolder,
  PublishResult,
  ServiceConfiguration,
  ValidationResult,
  WarehouseProfile,
  WorkspaceProfile
} from "@databricks-spatial-service-builder/shared";
import type { TableInfo } from "../types/app";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || response.statusText;
    try {
      const payload = JSON.parse(text) as { error?: string; message?: string };
      message = payload.error || payload.message || message;
    } catch {
      // Keep the raw response text when the backend did not return JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  workspaces: () => request<WorkspaceProfile[]>("/api/workspaces"),
  portalFolders: (portalToken: string, portalUrl: string) =>
    request<PortalFolder[]>("/api/arcgis/folders", {
      method: "POST",
      body: JSON.stringify({ portalToken, portalUrl })
    }),
  warehouses: (workspace: string) => request<WarehouseProfile[]>(`/api/workspaces/${workspace}/warehouses`),
  catalogs: (workspace: string, warehouse: string) =>
    request<string[]>(`/api/databricks/${workspace}/${warehouse}/catalogs`),
  schemas: (workspace: string, warehouse: string, catalog: string) =>
    request<string[]>(`/api/databricks/${workspace}/${warehouse}/catalogs/${catalog}/schemas`),
  tables: (workspace: string, warehouse: string, catalog: string, schema: string) =>
    request<TableInfo[]>(`/api/databricks/${workspace}/${warehouse}/catalogs/${catalog}/schemas/${schema}/tables`),
  geometryScanCache: (workspace: string, warehouse: string, catalog: string, schema: string) =>
    request<GeometryTableScanResult | null>(
      `/api/databricks/${workspace}/${warehouse}/catalogs/${catalog}/schemas/${schema}/geometry-scan`
    ),
  geometryScan: (workspace: string, warehouse: string, catalog: string, schema: string, tableNames: string[], forceRefresh = false) =>
    request<GeometryTableScanResult>(
      `/api/databricks/${workspace}/${warehouse}/catalogs/${catalog}/schemas/${schema}/geometry-scan`,
      {
        method: "POST",
        body: JSON.stringify({ tableNames, forceRefresh })
      }
    ),
  describe: (workspace: string, warehouse: string, tableName: string) =>
    request<ColumnDescription[]>(
      `/api/databricks/${workspace}/${warehouse}/table/describe?tableName=${encodeURIComponent(tableName)}`
    ),
  sample: (workspace: string, warehouse: string, tableName: string, limit = 20) =>
    request<Record<string, unknown>[]>(
      `/api/databricks/${workspace}/${warehouse}/table/sample?tableName=${encodeURIComponent(tableName)}&limit=${limit}`
    ),
  detect: (workspace: string, warehouse: string, tableName: string) =>
    request<DetectionResult>(`/api/databricks/${workspace}/${warehouse}/table/detect`, {
      method: "POST",
      body: JSON.stringify({ tableName })
    }),
  findObjectId: (workspace: string, warehouse: string, tableName: string, maxCandidates = 10) =>
    request<ObjectIdSearchResult>(`/api/databricks/${workspace}/${warehouse}/table/find-object-id`, {
      method: "POST",
      body: JSON.stringify({ tableName, maxCandidates })
    }),
  validate: (config: ServiceConfiguration) =>
    request<ValidationResult>("/api/arcgis/validate-service", {
      method: "POST",
      body: JSON.stringify({ config })
    }),
  publish: (config: ServiceConfiguration, portalToken: string, portalUrl: string) =>
    request<PublishResult>("/api/arcgis/publish-service", {
      method: "POST",
      body: JSON.stringify({ config, portalToken, portalUrl })
    })
};
