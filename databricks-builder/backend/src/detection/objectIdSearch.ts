import type { ColumnDescription, ObjectIdSearchResult } from "@databricks-spatial-service-builder/shared";
import { databricksClient } from "../databricks/client.js";
import { assertIdentifier, quoteIdentifier, quoteTableName } from "../databricks/identifiers.js";

const ID_NAMES = new Set(["id", "objectid", "object_id", "fid", "gid", "globalid"]);
const DEFAULT_MAX_CANDIDATES = 10;

function isSupportedIdType(dataType: string) {
  return /(string|char|varchar|tinyint|smallint|int|integer|bigint|long)/i.test(dataType);
}

function isStringType(dataType: string) {
  return /(string|char|varchar)/i.test(dataType);
}

function candidateScore(column: ColumnDescription) {
  const lowerName = column.name.toLowerCase();
  const dataType = column.dataType.toLowerCase();
  let score = 0;

  if (ID_NAMES.has(lowerName)) score += 100;
  if (lowerName.endsWith("_id")) score += 70;
  if (lowerName.includes("id")) score += 45;
  if (isStringType(dataType)) score += 12;
  if (/(int|integer|bigint|long)/i.test(dataType)) score += 8;

  return score || 1;
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function explainCandidate(valid: boolean, totalRows: number, nonNullRows: number, distinctRows: number) {
  if (valid) return "Values are unique and non-null in the current table scan.";
  if (totalRows !== nonNullRows) return "Contains null values.";
  if (totalRows !== distinctRows) return "Contains duplicate values.";
  return "Could not be validated as an ObjectID field.";
}

export async function findValidObjectIdField(
  workspace: string,
  warehouse: string,
  tableName: string,
  columns: ColumnDescription[],
  maxCandidates = DEFAULT_MAX_CANDIDATES
): Promise<ObjectIdSearchResult> {
  const candidates = columns
    .filter((column) => isSupportedIdType(column.dataType))
    .filter((column) => {
      try {
        assertIdentifier(column.name, "id candidate");
        return true;
      } catch {
        return false;
      }
    })
    .map((column) => ({ column, score: candidateScore(column) }))
    .sort((a, b) => b.score - a.score || a.column.name.localeCompare(b.column.name))
    .slice(0, Math.max(1, Math.min(maxCandidates, 20)));

  if (candidates.length === 0) {
    return {
      checkedCandidates: [],
      warnings: ["No string or integer identifier-like fields were found to validate."]
    };
  }

  const selectParts = ["COUNT(*) AS total_rows"];
  candidates.forEach(({ column }, index) => {
    const quoted = quoteIdentifier(column.name);
    selectParts.push(`COUNT(${quoted}) AS c${index}_non_null`);
    selectParts.push(`COUNT(DISTINCT ${quoted}) AS c${index}_distinct`);
  });

  const rows = await databricksClient.query(
    workspace,
    warehouse,
    `SELECT ${selectParts.join(", ")} FROM ${quoteTableName(tableName)}`
  );
  const row = rows[0] ?? {};
  const totalRows = numberValue(row.total_rows);

  const checkedCandidates = candidates.map(({ column }, index) => {
    const nonNullRows = numberValue(row[`c${index}_non_null`]);
    const distinctRows = numberValue(row[`c${index}_distinct`]);
    const valid = totalRows > 0 && totalRows === nonNullRows && totalRows === distinctRows;

    return {
      column: column.name,
      dataType: column.dataType,
      totalRows,
      nonNullRows,
      distinctRows,
      valid,
      reason: explainCandidate(valid, totalRows, nonNullRows, distinctRows)
    };
  });

  const selectedField = checkedCandidates.find((candidate) => candidate.valid)?.column;
  return {
    selectedField,
    checkedCandidates,
    warnings: selectedField ? [] : ["No valid ObjectID field was found among the checked candidates."]
  };
}
