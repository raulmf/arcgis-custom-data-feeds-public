import { Router } from "express";
import { z } from "zod";
import type { ServiceConfiguration } from "@databricks-spatial-service-builder/shared";
import { buildServiceParameters, validateServiceConfiguration } from "../arcgis/serviceParameters.js";
import { listPortalFolders, publishCdfService } from "../arcgis/publisher.js";

export const arcgisRouter = Router();

const RequestSchema = z.object({
  config: z.record(z.unknown()).transform((value) => value as unknown as ServiceConfiguration),
  portalToken: z.string().optional(),
  portalUrl: z.string().optional()
});

const PortalTokenSchema = z.object({
  portalToken: z.string().optional(),
  portalUrl: z.string().optional()
});

arcgisRouter.post("/validate-service", (req, res, next) => {
  try {
    const { config } = RequestSchema.parse(req.body);
    const validation = validateServiceConfiguration(config);
    const serviceParameters = validation.errors.length === 0 ? buildServiceParameters(config) : undefined;
    res.json({
      ok: validation.errors.length === 0,
      errors: validation.errors,
      warnings: validation.warnings,
      serviceParameters
    });
  } catch (error) {
    next(error);
  }
});

arcgisRouter.post("/publish-service", async (req, res, next) => {
  try {
    const { config, portalToken, portalUrl } = RequestSchema.parse(req.body);
    if (!portalToken) {
      res.status(401).json({ ok: false, errors: ["Portal token is required."], warnings: [] });
      return;
    }
    res.json(await publishCdfService({ config, portalToken, portalUrl }));
  } catch (error) {
    next(error);
  }
});

arcgisRouter.post("/folders", async (req, res, next) => {
  try {
    const { portalToken, portalUrl } = PortalTokenSchema.parse(req.body);
    if (!portalToken) {
      res.status(401).json({ error: "Portal token is required." });
      return;
    }
    res.json(await listPortalFolders(portalToken, portalUrl));
  } catch (error) {
    next(error);
  }
});
