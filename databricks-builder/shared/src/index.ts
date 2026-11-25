export type GeometryFormat = "GEOMETRY" | "WKT" | "WKB" | "GEOJSON" | "WKT_DECIMAL_COMMA";

export type ColumnRole = "id" | "geometry" | "time" | "attribute";

export interface WorkspaceProfile {
  id: string;
  label: string;
  host: string;
}

export interface WarehouseProfile {
  id: string;
  name: string;
  httpPath: string;
}

export interface TableReference {
  catalog: string;
  schema: string;
  table: string;
}

export interface ColumnDescription {
  name: string;
  dataType: string;
  nullable?: boolean;
  comment?: string;
  sampleValues?: unknown[];
  likelyRole?: ColumnRole;
}

export interface DetectionResult {
  geometryCandidates: Array<{ column: string; format: GeometryFormat; confidence: number; reason: string }>;
  idCandidates: Array<{ column: string; confidence: number; reason: string }>;
  timeCandidates: Array<{ column: string; confidence: number; reason: string }>;
  suggestedGeometryColumn?: string;
  suggestedGeometryFormat?: GeometryFormat;
  suggestedIdField?: string;
  suggestedSrid: string;
  geometryType?: string;
  warnings: string[];
}

export interface ObjectIdSearchResult {
  selectedField?: string;
  checkedCandidates: Array<{
    column: string;
    dataType: string;
    totalRows: number;
    nonNullRows: number;
    distinctRows: number;
    valid: boolean;
    reason: string;
  }>;
  warnings: string[];
}

export interface PortalFolder {
  id: string;
  title: string;
}

export interface GeometryTableScanResult {
  scannedAt: string;
  catalog: string;
  schema: string;
  tables: Array<{
    name: string;
    type: "table" | "view";
    hasGeometry: boolean;
    candidates: Array<{
      column: string;
      dataType: string;
      confidence: number;
      reason: string;
    }>;
    error?: string;
  }>;
}

export interface ServiceConfiguration {
  workspace: string;
  warehouseId: string;
  warehouseHttpPath: string;
  tableName: string;
  geometryColumn: string;
  idField: string;
  geometryFormat: GeometryFormat;
  srid: string;
  maxRecordCount: string;
  enableGeometryGeneralization?: boolean;
  minGeneralizationTolerance?: string;
  maxGeneralizationTolerance?: string;
  queryCacheEnabled?: boolean;
  queryCacheTtlSeconds?: string;
  queryCacheMaxEntries?: string;
  timeColumn?: string;
  serviceName: string;
  editable: boolean;
  folderId?: string;
  groupIds?: string[];
  sharing?: "private" | "org" | "public";
  lakebaseHost?: string;
  lakebasePort?: string;
  lakebaseDatabase?: string;
  lakebaseSchema?: string;
  lakebaseTable?: string;
  advancedParameters?: Record<string, string>;
}

export interface CdfServiceParameters {
  workspace: string;
  warehouseHttpPath: string;
  tableName: string;
  geometryColumn: string;
  idField: string;
  geometryFormat: GeometryFormat;
  srid: string;
  maxRecordCount: string;
  enableGeometryGeneralization: string;
  minGeneralizationTolerance: string;
  maxGeneralizationTolerance: string;
  queryCacheEnabled: string;
  queryCacheTtlSeconds: string;
  queryCacheMaxEntries: string;
  timeColumn: string;
  lakebaseHost: string;
  lakebasePort: string;
  lakebaseDatabase: string;
  lakebaseSchema: string;
  lakebaseTable: string;
  editingEnabled: "true" | "false";
  [key: string]: string | undefined;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  serviceParameters?: CdfServiceParameters;
  sampleRows?: Record<string, unknown>[];
}

export interface PublishResult {
  ok: boolean;
  itemId?: string;
  itemUrl?: string;
  mapViewerUrl?: string;
  restUrl?: string;
  errors: string[];
  warnings: string[];
}
