import type { ColumnDescription, GeometryTableScanResult } from "@databricks-spatial-service-builder/shared";
import { databricksClient } from "./client.js";
import { assertIdentifier, parseTableName, quoteIdentifier, quoteTableName } from "./identifiers.js";

function firstValue(row: Record<string, unknown>): unknown {
  return Object.values(row)[0];
}

export async function listCatalogs(workspace: string, warehouse: string) {
  const rows = await databricksClient.query(workspace, warehouse, "SHOW CATALOGS");
  return rows.map((row) => String(firstValue(row)));
}

export async function listSchemas(workspace: string, warehouse: string, catalog: string) {
  const rows = await databricksClient.query(workspace, warehouse, `SHOW SCHEMAS IN ${quoteIdentifier(catalog)}`);
  return rows.map((row) => String(firstValue(row)));
}

export async function listTables(workspace: string, warehouse: string, catalog: string, schema: string): Promise<Array<{ name: string; type: "table" | "view" }>> {
  const rows = await databricksClient.query(
    workspace,
    warehouse,
    `SHOW TABLES IN ${quoteIdentifier(catalog)}.${quoteIdentifier(schema)}`
  );

  return rows.map((row) => ({
    name: String(row.tableName ?? row.table_name ?? firstValue(row)),
    type: String(row.tableType ?? row.table_type ?? "TABLE").toLowerCase().includes("view") ? "view" : "table"
  }));
}

export async function describeTable(workspace: string, warehouse: string, tableName: string): Promise<ColumnDescription[]> {
  const quoted = quoteTableName(tableName);
  const rows = await databricksClient.query(workspace, warehouse, `DESCRIBE TABLE ${quoted}`);

  return rows
    .filter((row) => row.col_name && !String(row.col_name).startsWith("#"))
    .map((row) => ({
      name: String(row.col_name),
      dataType: String(row.data_type ?? "string"),
      comment: row.comment ? String(row.comment) : undefined
    }));
}

export async function sampleTable(workspace: string, warehouse: string, tableName: string, limit = 20) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const rows = await databricksClient.query(
    workspace,
    warehouse,
    `SELECT * FROM ${quoteTableName(tableName)} LIMIT ${safeLimit}`
  );
  return rows;
}

function geometryCandidates(columns: ColumnDescription[]): GeometryTableScanResult["tables"][number]["candidates"] {
  return columns.flatMap((column) => {
    const name = column.name.toLowerCase();
    const dataType = column.dataType.toLowerCase();

    if (dataType === "geometry" || dataType === "geography") {
      return [{
        column: column.name,
        dataType: column.dataType,
        confidence: 0.95,
        reason: "Databricks native spatial type."
      }];
    }

    if (/(^|_)(geom|geometry|geometria|georeferencia|shape)(_|$)/i.test(column.name) && dataType.includes("string")) {
      return [{
        column: column.name,
        dataType: column.dataType,
        confidence: 0.65,
        reason: "Column name suggests WKT or GeoJSON geometry."
      }];
    }

    if (/(^|_)(geom|geometry|wkb|shape)(_|$)/i.test(column.name) && (dataType.includes("binary") || dataType.includes("string"))) {
      return [{
        column: column.name,
        dataType: column.dataType,
        confidence: 0.6,
        reason: "Column name and type suggest encoded geometry."
      }];
    }

    if ((name === "lat" || name === "latitude" || name === "y") && dataType.match(/double|float|decimal|int/)) {
      return [{
        column: column.name,
        dataType: column.dataType,
        confidence: 0.35,
        reason: "Coordinate-like latitude column."
      }];
    }

    if ((name === "lon" || name === "lng" || name === "longitude" || name === "x") && dataType.match(/double|float|decimal|int/)) {
      return [{
        column: column.name,
        dataType: column.dataType,
        confidence: 0.35,
        reason: "Coordinate-like longitude column."
      }];
    }

    return [];
  });
}

export async function scanTablesForGeometry(
  workspace: string,
  warehouse: string,
  catalog: string,
  schema: string,
  tableNames?: string[]
): Promise<GeometryTableScanResult> {
  const tables = tableNames?.length
    ? tableNames.map((name) => ({ name: assertIdentifier(name, "table"), type: "table" as const }))
    : await listTables(workspace, warehouse, catalog, schema);

  const scannedTables: GeometryTableScanResult["tables"] = [];

  for (const table of tables) {
    try {
      const columns = await describeTable(workspace, warehouse, buildFullyQualifiedName(catalog, schema, table.name));
      const candidates = geometryCandidates(columns);
      scannedTables.push({
        ...table,
        hasGeometry: candidates.some((candidate) => candidate.confidence >= 0.6),
        candidates
      });
    } catch (error) {
      scannedTables.push({
        ...table,
        hasGeometry: false,
        candidates: [],
        error: error instanceof Error ? error.message : "Could not inspect table."
      });
    }
  }

  return {
    scannedAt: new Date().toISOString(),
    catalog,
    schema,
    tables: scannedTables
  };
}

export function buildFullyQualifiedName(catalog: string, schema: string, table: string) {
  return [catalog, schema, table].map((part) => assertIdentifier(part)).join(".");
}

export function validateTableName(tableName: string) {
  return parseTableName(tableName);
}
