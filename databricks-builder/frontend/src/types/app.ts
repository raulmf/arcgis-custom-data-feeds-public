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

export interface TableInfo {
  name: string;
  type: "table" | "view";
}

export interface WizardState {
  portalUrl: string;
  portalToken?: string;
  userName?: string;
  portalFolders: PortalFolder[];
  workspaces: WorkspaceProfile[];
  selectedWorkspace?: WorkspaceProfile;
  warehouses: WarehouseProfile[];
  selectedWarehouse?: WarehouseProfile;
  catalogs: string[];
  schemas: string[];
  tables: TableInfo[];
  selectedCatalog?: string;
  selectedSchema?: string;
  selectedTable?: TableInfo;
  columns: ColumnDescription[];
  sampleRows: Record<string, unknown>[];
  detection?: DetectionResult;
  geometryScan?: GeometryTableScanResult;
  objectIdSearch?: ObjectIdSearchResult;
  config?: ServiceConfiguration;
  validation?: ValidationResult;
  publishResult?: PublishResult;
}
