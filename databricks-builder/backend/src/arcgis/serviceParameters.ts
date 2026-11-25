import type { CdfServiceParameters, ServiceConfiguration } from "@databricks-spatial-service-builder/shared";
import { assertIdentifier, parseTableName } from "../databricks/identifiers.js";

function assertNumericString(value: string, label: string) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${label} must be a positive integer string.`);
  }
  return value;
}

function optionalDecimalString(value: string | undefined, label: string) {
  if (!value) return "";
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new Error(`${label} must be a non-negative decimal string.`);
  }
  return value;
}

function defaultMaxGeneralizationTolerance(config: ServiceConfiguration) {
  if (config.maxGeneralizationTolerance) return config.maxGeneralizationTolerance;
  return config.srid === "4326" ? "0.001" : undefined;
}

export function buildServiceParameters(config: ServiceConfiguration): CdfServiceParameters {
  parseTableName(config.tableName);
  assertIdentifier(config.geometryColumn, "geometry column");
  assertIdentifier(config.idField, "id field");
  if (config.timeColumn) assertIdentifier(config.timeColumn, "time column");

  const params: CdfServiceParameters = {
    workspace: config.workspace || "default",
    warehouseHttpPath: config.warehouseHttpPath,
    tableName: config.tableName,
    geometryColumn: config.geometryColumn,
    idField: config.idField,
    geometryFormat: config.geometryFormat,
    srid: assertNumericString(config.srid, "SRID"),
    maxRecordCount: assertNumericString(config.maxRecordCount, "maxRecordCount"),
    enableGeometryGeneralization: config.enableGeometryGeneralization === false ? "false" : "true",
    minGeneralizationTolerance: optionalDecimalString(config.minGeneralizationTolerance, "minGeneralizationTolerance"),
    maxGeneralizationTolerance: optionalDecimalString(defaultMaxGeneralizationTolerance(config), "maxGeneralizationTolerance"),
    queryCacheEnabled: config.queryCacheEnabled === true ? "true" : "false",
    queryCacheTtlSeconds: config.queryCacheTtlSeconds ? assertNumericString(config.queryCacheTtlSeconds, "queryCacheTtlSeconds") : "",
    queryCacheMaxEntries: config.queryCacheMaxEntries ? assertNumericString(config.queryCacheMaxEntries, "queryCacheMaxEntries") : "",
    timeColumn: config.timeColumn ?? "",
    lakebaseHost: "",
    lakebasePort: "",
    lakebaseDatabase: "",
    lakebaseSchema: "",
    lakebaseTable: "",
    editingEnabled: "false"
  };

  if (config.editable) {
    params.editingEnabled = "true";
    params.lakebaseHost = config.lakebaseHost ?? "";
    params.lakebasePort = config.lakebasePort ?? "5432";
    params.lakebaseDatabase = config.lakebaseDatabase ?? "";
    params.lakebaseSchema = config.lakebaseSchema ?? "";
    params.lakebaseTable = config.lakebaseTable ?? "";
  }

  return { ...params, ...config.advancedParameters };
}

export function validateServiceConfiguration(config: ServiceConfiguration) {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    buildServiceParameters(config);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Invalid service configuration.");
  }

  if (!config.serviceName?.trim()) errors.push("Service name is required.");
  if (config.editable) {
    for (const [key, value] of Object.entries({
      lakebaseHost: config.lakebaseHost,
      lakebaseDatabase: config.lakebaseDatabase,
      lakebaseSchema: config.lakebaseSchema,
      lakebaseTable: config.lakebaseTable
    })) {
      if (!value) errors.push(`${key} is required when editable mode is enabled.`);
    }
  }

  if (Number(config.maxRecordCount) > 10000) {
    warnings.push("Large maxRecordCount values can make CDF queries slow.");
  }

  return { errors, warnings };
}
