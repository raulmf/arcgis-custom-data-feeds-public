import { Router } from "express";
import { z } from "zod";
import { detectSpatialConfiguration } from "../detection/detect.js";
import { findValidObjectIdField } from "../detection/objectIdSearch.js";
import { readGeometryScanCache, writeGeometryScanCache } from "../databricks/geometryScanCache.js";
import {
  describeTable,
  listCatalogs,
  listSchemas,
  listTables,
  sampleTable,
  scanTablesForGeometry
} from "../databricks/metadataService.js";

export const databricksRouter = Router({ mergeParams: true });

const TableQuery = z.object({ tableName: z.string().min(1), limit: z.coerce.number().optional() });
const DetectBody = z.object({ tableName: z.string().min(1) });
const ObjectIdSearchBody = z.object({ tableName: z.string().min(1), maxCandidates: z.coerce.number().optional() });
const GeometryScanBody = z.object({
  tableNames: z.array(z.string().min(1)).optional(),
  forceRefresh: z.boolean().optional()
}).optional();

databricksRouter.get("/:workspace/:warehouse/catalogs", async (req, res, next) => {
  try {
    res.json(await listCatalogs(req.params.workspace, req.params.warehouse));
  } catch (error) {
    next(error);
  }
});

databricksRouter.get("/:workspace/:warehouse/catalogs/:catalog/schemas", async (req, res, next) => {
  try {
    res.json(await listSchemas(req.params.workspace, req.params.warehouse, req.params.catalog));
  } catch (error) {
    next(error);
  }
});

databricksRouter.get("/:workspace/:warehouse/catalogs/:catalog/schemas/:schema/tables", async (req, res, next) => {
  try {
    res.json(await listTables(req.params.workspace, req.params.warehouse, req.params.catalog, req.params.schema));
  } catch (error) {
    next(error);
  }
});

databricksRouter.post("/:workspace/:warehouse/catalogs/:catalog/schemas/:schema/geometry-scan", async (req, res, next) => {
  try {
    const body = GeometryScanBody.parse(req.body);
    if (!body?.forceRefresh) {
      const cached = await readGeometryScanCache(
        req.params.workspace,
        req.params.warehouse,
        req.params.catalog,
        req.params.schema
      );
      if (cached) {
        res.json(cached);
        return;
      }
    }

    const scan = await scanTablesForGeometry(
      req.params.workspace,
      req.params.warehouse,
      req.params.catalog,
      req.params.schema,
      body?.tableNames
    );
    await writeGeometryScanCache(
      req.params.workspace,
      req.params.warehouse,
      req.params.catalog,
      req.params.schema,
      scan
    );
    res.json(scan);
  } catch (error) {
    next(error);
  }
});

databricksRouter.get("/:workspace/:warehouse/catalogs/:catalog/schemas/:schema/geometry-scan", async (req, res, next) => {
  try {
    res.json(
      await readGeometryScanCache(
        req.params.workspace,
        req.params.warehouse,
        req.params.catalog,
        req.params.schema
      ) ?? null
    );
  } catch (error) {
    next(error);
  }
});

databricksRouter.get("/:workspace/:warehouse/table/describe", async (req, res, next) => {
  try {
    const { tableName } = TableQuery.parse(req.query);
    res.json(await describeTable(req.params.workspace, req.params.warehouse, tableName));
  } catch (error) {
    next(error);
  }
});

databricksRouter.get("/:workspace/:warehouse/table/sample", async (req, res, next) => {
  try {
    const { tableName, limit } = TableQuery.parse(req.query);
    res.json(await sampleTable(req.params.workspace, req.params.warehouse, tableName, limit));
  } catch (error) {
    next(error);
  }
});

databricksRouter.post("/:workspace/:warehouse/table/detect", async (req, res, next) => {
  try {
    const { tableName } = DetectBody.parse(req.body);
    const [columns, sampleRows] = await Promise.all([
      describeTable(req.params.workspace, req.params.warehouse, tableName),
      sampleTable(req.params.workspace, req.params.warehouse, tableName, 20)
    ]);
    res.json(detectSpatialConfiguration(columns, sampleRows));
  } catch (error) {
    next(error);
  }
});

databricksRouter.post("/:workspace/:warehouse/table/find-object-id", async (req, res, next) => {
  try {
    const { tableName, maxCandidates } = ObjectIdSearchBody.parse(req.body);
    const columns = await describeTable(req.params.workspace, req.params.warehouse, tableName);
    res.json(await findValidObjectIdField(req.params.workspace, req.params.warehouse, tableName, columns, maxCandidates));
  } catch (error) {
    next(error);
  }
});
