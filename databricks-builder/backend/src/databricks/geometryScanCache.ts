import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { GeometryTableScanResult } from "@databricks-spatial-service-builder/shared";

interface GeometryScanCacheFile {
  version: 1;
  workspace: string;
  warehouse: string;
  catalog: string;
  schema: string;
  result: GeometryTableScanResult;
}

const moduleDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(moduleDir, "../../..");
const cacheDir = resolve(projectRoot, ".cache", "geometry-scans");

function cacheFileName(workspace: string, warehouse: string, catalog: string, schema: string) {
  const readable = [workspace, warehouse, catalog, schema]
    .map((part) => part.replace(/[^A-Za-z0-9_.-]/g, "_"))
    .join("__")
    .slice(0, 140);
  const hash = createHash("sha256")
    .update(JSON.stringify({ workspace, warehouse, catalog, schema }))
    .digest("hex")
    .slice(0, 12);
  return `${readable}__${hash}.json`;
}

export function getGeometryScanCachePath(workspace: string, warehouse: string, catalog: string, schema: string) {
  return resolve(cacheDir, cacheFileName(workspace, warehouse, catalog, schema));
}

export async function readGeometryScanCache(
  workspace: string,
  warehouse: string,
  catalog: string,
  schema: string
) {
  const filePath = getGeometryScanCachePath(workspace, warehouse, catalog, schema);

  try {
    const raw = await readFile(filePath, "utf8");
    const cached = JSON.parse(raw) as Partial<GeometryScanCacheFile>;
    if (
      cached.version !== 1 ||
      cached.workspace !== workspace ||
      cached.warehouse !== warehouse ||
      cached.catalog !== catalog ||
      cached.schema !== schema ||
      !cached.result
    ) {
      return undefined;
    }
    return cached.result;
  } catch {
    return undefined;
  }
}

export async function writeGeometryScanCache(
  workspace: string,
  warehouse: string,
  catalog: string,
  schema: string,
  result: GeometryTableScanResult
) {
  const filePath = getGeometryScanCachePath(workspace, warehouse, catalog, schema);
  const payload: GeometryScanCacheFile = {
    version: 1,
    workspace,
    warehouse,
    catalog,
    schema,
    result
  };

  await mkdir(cacheDir, { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
