import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env"), override: false });

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  PORTAL_URL: z.string().url().default("https://www.arcgis.com"),
  ARCGIS_CLIENT_ID: z.string().optional(),
  ARCGIS_SERVER_ADMIN_URL: z.string().url().optional(),
  CDF_PROVIDER_NAME: z.string().default("databricks-geospatial-provider"),
  DATABRICKS_CONFIG_FILE: z.string().default("./databricks.workspaces.json"),
  APP_BASE_URL: z.string().url().default("http://localhost:5173")
});

export const env = EnvSchema.parse(process.env);
