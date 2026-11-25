import { Router } from "express";
import { getWorkspace, listWorkspaces } from "../config/workspaces.js";

export const workspaceRouter = Router();

workspaceRouter.get("/", (_req, res) => {
  res.json(listWorkspaces());
});

workspaceRouter.get("/:workspace/warehouses", (req, res, next) => {
  try {
    res.json(getWorkspace(req.params.workspace).warehouses);
  } catch (error) {
    next(error);
  }
});
