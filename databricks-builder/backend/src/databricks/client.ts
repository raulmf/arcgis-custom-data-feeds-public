import { DBSQLClient } from "@databricks/sql";
import { getWarehouse, getWorkspace, getWorkspaceToken } from "../config/workspaces.js";

type Row = Record<string, unknown>;

function asDatabricksError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = /bad HTTP status code:\s*(\d{3})/i.exec(message)?.[1];

  if (status === "403") {
    return new Error(
      "Databricks returned 403 for the SQL warehouse request. Check that the server-side Databricks token is valid, " +
        "the token principal has CAN USE permission on the SQL warehouse, and the client network/IP is allowed by the workspace."
    );
  }

  if (status) {
    return new Error(`Databricks returned HTTP ${status} for the SQL warehouse request.`);
  }

  return error instanceof Error ? error : new Error(message);
}

export class DatabricksMetadataClient {
  async query(workspaceId: string, warehouseId: string, statement: string): Promise<Row[]> {
    const workspace = getWorkspace(workspaceId);
    const warehouse = getWarehouse(workspaceId, warehouseId);
    const client = new DBSQLClient();

    try {
      const dbClient = await client.connect({
        host: workspace.host,
        path: warehouse.httpPath,
        token: getWorkspaceToken(workspaceId)
      });

      const session = await dbClient.openSession();
      try {
        const operation = await session.executeStatement(statement);
        const result = await operation.fetchAll();
        await operation.close();
        return result as Row[];
      } finally {
        await session.close();
        await dbClient.close();
      }
    } catch (error) {
      throw asDatabricksError(error);
    }
  }
}

export const databricksClient = new DatabricksMetadataClient();
