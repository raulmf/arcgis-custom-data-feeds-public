const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function assertIdentifier(value: string, label = "identifier"): string {
  if (!IDENTIFIER.test(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return value;
}

export function parseTableName(tableName: string) {
  const parts = tableName.split(".");
  if (parts.length !== 3) {
    throw new Error("Table name must be fully qualified as catalog.schema.table");
  }

  const [catalog, schema, table] = parts.map((part) => assertIdentifier(part));
  return { catalog, schema, table };
}

export function quoteIdentifier(value: string): string {
  return `\`${assertIdentifier(value)}\``;
}

export function quoteTableName(tableName: string): string {
  const { catalog, schema, table } = parseTableName(tableName);
  return [catalog, schema, table].map(quoteIdentifier).join(".");
}
