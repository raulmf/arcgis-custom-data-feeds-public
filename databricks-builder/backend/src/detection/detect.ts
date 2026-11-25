import type { ColumnDescription, DetectionResult, GeometryFormat } from "@databricks-spatial-service-builder/shared";

const ID_NAMES = new Set(["id", "objectid", "object_id", "fid", "gid", "globalid"]);
const TIME_NAMES = new Set(["created_at", "updated_at", "timestamp", "date", "created", "modified"]);
const WKT_PREFIX = /^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON)\s*\(/i;
const WKT_DECIMAL_COMMA = /\d+,\d+\s+\d+,\d+/;
const HEX = /^(0x)?[0-9a-f]+$/i;

function isIntegerType(dataType: string) {
  return /(tinyint|smallint|int|integer|bigint|long)/i.test(dataType);
}

function isTimeType(dataType: string) {
  return /(timestamp|date)/i.test(dataType);
}

function isBinaryType(dataType: string) {
  return /(binary|varbinary)/i.test(dataType);
}

function sampleStrings(column: string, rows: Record<string, unknown>[]) {
  return rows
    .map((row) => row[column])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
}

function detectStringGeometry(values: string[]): { format: GeometryFormat; reason: string } | undefined {
  const first = values[0];
  if (!first) return undefined;

  if (WKT_PREFIX.test(first)) {
    return WKT_DECIMAL_COMMA.test(first)
      ? { format: "WKT_DECIMAL_COMMA", reason: "Sample value looks like WKT with decimal commas." }
      : { format: "WKT", reason: "Sample value starts with a WKT geometry token." };
  }

  try {
    const json = JSON.parse(first) as { type?: unknown; coordinates?: unknown };
    if (json && typeof json.type === "string" && Array.isArray(json.coordinates)) {
      return { format: "GEOJSON", reason: "Sample value parses as GeoJSON geometry." };
    }
  } catch {
    // Not JSON; continue with other geometry checks.
  }

  if (first.length > 20 && first.length % 2 === 0 && HEX.test(first)) {
    return { format: "WKB", reason: "Sample value is a hex-like binary geometry." };
  }

  return undefined;
}

function inferGeometryType(values: string[]) {
  const match = values.find((value) => WKT_PREFIX.test(value))?.match(WKT_PREFIX);
  return match?.[1]?.toUpperCase();
}

export function detectSpatialConfiguration(
  columns: ColumnDescription[],
  sampleRows: Record<string, unknown>[] = []
): DetectionResult {
  const geometryCandidates: DetectionResult["geometryCandidates"] = [];
  const idCandidates: DetectionResult["idCandidates"] = [];
  const timeCandidates: DetectionResult["timeCandidates"] = [];
  const warnings: string[] = [];

  for (const column of columns) {
    const name = column.name;
    const lowerName = name.toLowerCase();
    const dataType = column.dataType.toLowerCase();

    if (/(geometry|geography)/i.test(dataType)) {
      geometryCandidates.push({
        column: name,
        format: "GEOMETRY",
        confidence: 0.98,
        reason: "Databricks native spatial type."
      });
    } else if (isBinaryType(dataType)) {
      geometryCandidates.push({
        column: name,
        format: "WKB",
        confidence: 0.72,
        reason: "Binary column can contain WKB geometry."
      });
    } else if (/string/i.test(dataType)) {
      const detected = detectStringGeometry(sampleStrings(name, sampleRows));
      if (detected) {
        geometryCandidates.push({
          column: name,
          format: detected.format,
          confidence: 0.86,
          reason: detected.reason
        });
      }
    } else if (/(map|array|struct)/i.test(dataType)) {
      warnings.push(`${name} uses ${column.dataType}; complex attribute types may not publish cleanly.`);
    }

    if (ID_NAMES.has(lowerName) || (lowerName.endsWith("_id") && isIntegerType(dataType))) {
      idCandidates.push({
        column: name,
        confidence: ID_NAMES.has(lowerName) ? 0.9 : 0.68,
        reason: isIntegerType(dataType) ? "Integer identifier-like field." : "Identifier-like field name."
      });
    }

    if (isTimeType(dataType) || TIME_NAMES.has(lowerName)) {
      timeCandidates.push({
        column: name,
        confidence: isTimeType(dataType) ? 0.88 : 0.62,
        reason: isTimeType(dataType) ? "Timestamp/date field." : "Time-like field name."
      });
    }
  }

  geometryCandidates.sort((a, b) => b.confidence - a.confidence);
  idCandidates.sort((a, b) => b.confidence - a.confidence);
  timeCandidates.sort((a, b) => b.confidence - a.confidence);

  const suggestedGeometryColumn = geometryCandidates[0]?.column;
  const suggestedGeometryFormat = geometryCandidates[0]?.format;
  const suggestedIdField = idCandidates[0]?.column;
  const geometryType = suggestedGeometryColumn ? inferGeometryType(sampleStrings(suggestedGeometryColumn, sampleRows)) : undefined;

  if (!suggestedGeometryColumn) {
    warnings.push("No geometry column was detected. Select one manually before publishing.");
  }
  if (!suggestedIdField) {
    warnings.push("No strong object id candidate was detected. Choose a stable unique field.");
  }

  return {
    geometryCandidates,
    idCandidates,
    timeCandidates,
    suggestedGeometryColumn,
    suggestedGeometryFormat,
    suggestedIdField,
    suggestedSrid: "4326",
    geometryType,
    warnings
  };
}
