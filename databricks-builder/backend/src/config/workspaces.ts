import fs from "node:fs";
import path from "node:path";
import type { WarehouseProfile, WorkspaceProfile } from "@databricks-spatial-service-builder/shared";
import { env } from "./env.js";

interface WorkspaceConfig extends WorkspaceProfile {
  tokenEnv: string;
  warehouses: WarehouseProfile[];
  lakebase?: {
    host?: string;
    port?: string;
    database?: string;
    schema?: string;
  };
}

function configPath() {
  if (path.isAbsolute(env.DATABRICKS_CONFIG_FILE)) {
    return env.DATABRICKS_CONFIG_FILE;
  }

  const candidates = [
    path.resolve(process.cwd(), env.DATABRICKS_CONFIG_FILE),
    path.resolve(process.cwd(), "..", env.DATABRICKS_CONFIG_FILE)
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

export function loadWorkspaceConfigs(): WorkspaceConfig[] {
  const file = configPath();
  if (!fs.existsSync(file)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(file, "utf8")) as WorkspaceConfig[];
}

export function listWorkspaces(): WorkspaceProfile[] {
  return loadWorkspaceConfigs().map(({ id, label, host }) => ({ id, label, host }));
}

export function getWorkspace(id: string): WorkspaceConfig {
  const workspace = loadWorkspaceConfigs().find((candidate) => candidate.id === id);
  if (!workspace) {
    throw new Error(`Unknown Databricks workspace profile: ${id}`);
  }
  return workspace;
}

export function getWarehouse(workspaceId: string, warehouseId: string): WarehouseProfile {
  const warehouse = getWorkspace(workspaceId).warehouses.find((candidate) => candidate.id === warehouseId);
  if (!warehouse) {
    throw new Error(`Unknown SQL warehouse profile: ${warehouseId}`);
  }
  return warehouse;
}

export function getWorkspaceToken(workspaceId: string): string {
  const workspace = getWorkspace(workspaceId);
  const token = process.env[workspace.tokenEnv];
  if (!token) {
    throw new Error(`Missing Databricks token environment variable: ${workspace.tokenEnv}`);
  }
  return token;
}
