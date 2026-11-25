import cors from "cors";
import express from "express";
import helmet from "helmet";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { arcgisRouter } from "./routes/arcgis.js";
import { databricksRouter } from "./routes/databricks.js";
import { workspaceRouter } from "./routes/workspaces.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.APP_BASE_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
app.use("/api/workspaces", workspaceRouter);
app.use("/api/databricks", databricksRouter);
app.use("/api/arcgis", arcgisRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", details: error.flatten() });
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  const databricksStatus = /bad HTTP status code:\s*(\d{3})/i.exec(message)?.[1];
  const status = databricksStatus ? Number(databricksStatus) : 500;
  res.status(status).json({ error: message });
});

app.listen(env.PORT, () => {
  console.log(`Databricks Spatial Service Builder API listening on ${env.PORT}`);
});
