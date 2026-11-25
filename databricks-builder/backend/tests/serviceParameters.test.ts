import { describe, expect, it } from "vitest";
import { buildServiceParameters } from "../src/arcgis/serviceParameters.js";

describe("buildServiceParameters", () => {
  it("builds read-only CDF parameters", () => {
    expect(
      buildServiceParameters({
        workspace: "prod",
        warehouseId: "main",
        warehouseHttpPath: "/sql/1.0/warehouses/abc",
        tableName: "main.gis.parcels",
        geometryColumn: "geom",
        idField: "objectid",
        geometryFormat: "GEOMETRY",
        srid: "4326",
        maxRecordCount: "2000",
        enableGeometryGeneralization: true,
        minGeneralizationTolerance: "0",
        maxGeneralizationTolerance: "100",
        queryCacheEnabled: true,
        queryCacheTtlSeconds: "600",
        queryCacheMaxEntries: "1000",
        serviceName: "Parcels",
        editable: false
      })
    ).toEqual({
      workspace: "prod",
      warehouseHttpPath: "/sql/1.0/warehouses/abc",
      tableName: "main.gis.parcels",
      geometryColumn: "geom",
      idField: "objectid",
      geometryFormat: "GEOMETRY",
      srid: "4326",
      maxRecordCount: "2000",
      enableGeometryGeneralization: "true",
      minGeneralizationTolerance: "0",
      maxGeneralizationTolerance: "100",
      queryCacheEnabled: "true",
      queryCacheTtlSeconds: "600",
      queryCacheMaxEntries: "1000",
      timeColumn: "",
      lakebaseHost: "",
      lakebasePort: "",
      lakebaseDatabase: "",
      lakebaseSchema: "",
      lakebaseTable: "",
      editingEnabled: "false"
    });
  });

  it("adds Lakebase parameters for editable services", () => {
    const params = buildServiceParameters({
      workspace: "prod",
      warehouseId: "main",
      warehouseHttpPath: "/sql/1.0/warehouses/abc",
      tableName: "main.gis.parcels",
      geometryColumn: "geom",
      idField: "objectid",
      geometryFormat: "WKT",
      srid: "4326",
      maxRecordCount: "2000",
      serviceName: "Parcels",
      editable: true,
      lakebaseHost: "lakebase.example.com",
      lakebaseDatabase: "gis",
      lakebaseSchema: "public",
      lakebaseTable: "parcels"
    });

    expect(params.editingEnabled).toBe("true");
    expect(params.lakebasePort).toBe("5432");
  });

  it("defaults geometry generalization parameters", () => {
    const params = buildServiceParameters({
      workspace: "prod",
      warehouseId: "main",
      warehouseHttpPath: "/sql/1.0/warehouses/abc",
      tableName: "main.gis.parcels",
      geometryColumn: "geom",
      idField: "objectid",
      geometryFormat: "GEOMETRY",
      srid: "4326",
      maxRecordCount: "2000",
      serviceName: "Parcels",
      editable: false
    });

    expect(params.enableGeometryGeneralization).toBe("true");
    expect(params.minGeneralizationTolerance).toBe("");
    expect(params.maxGeneralizationTolerance).toBe("0.001");
    expect(params.queryCacheEnabled).toBe("false");
    expect(params.queryCacheTtlSeconds).toBe("");
    expect(params.queryCacheMaxEntries).toBe("");
  });

  it("rejects invalid query cache numeric parameters", () => {
    expect(() =>
      buildServiceParameters({
        workspace: "prod",
        warehouseId: "main",
        warehouseHttpPath: "/sql/1.0/warehouses/abc",
        tableName: "main.gis.parcels",
        geometryColumn: "geom",
        idField: "objectid",
        geometryFormat: "GEOMETRY",
        srid: "4326",
        maxRecordCount: "2000",
        queryCacheEnabled: true,
        queryCacheTtlSeconds: "300; DROP",
        serviceName: "Parcels",
        editable: false
      })
    ).toThrow();
  });

  it("does not default maximum geometry generalization tolerance for non-4326 SRIDs", () => {
    const params = buildServiceParameters({
      workspace: "prod",
      warehouseId: "main",
      warehouseHttpPath: "/sql/1.0/warehouses/abc",
      tableName: "main.gis.parcels",
      geometryColumn: "geom",
      idField: "objectid",
      geometryFormat: "GEOMETRY",
      srid: "3857",
      maxRecordCount: "2000",
      serviceName: "Parcels",
      editable: false
    });

    expect(params.maxGeneralizationTolerance).toBe("");
  });

  it("rejects invalid generalization tolerance", () => {
    expect(() =>
      buildServiceParameters({
        workspace: "prod",
        warehouseId: "main",
        warehouseHttpPath: "/sql/1.0/warehouses/abc",
        tableName: "main.gis.parcels",
        geometryColumn: "geom",
        idField: "objectid",
        geometryFormat: "GEOMETRY",
        srid: "4326",
        maxRecordCount: "2000",
        maxGeneralizationTolerance: "1; DROP TABLE x",
        serviceName: "Parcels",
        editable: false
      })
    ).toThrow();
  });

  it("rejects unsafe identifiers", () => {
    expect(() =>
      buildServiceParameters({
        workspace: "prod",
        warehouseId: "main",
        warehouseHttpPath: "/sql/1.0/warehouses/abc",
        tableName: "main.gis.parcels;drop",
        geometryColumn: "geom",
        idField: "objectid",
        geometryFormat: "GEOMETRY",
        srid: "4326",
        maxRecordCount: "2000",
        serviceName: "Parcels",
        editable: false
      })
    ).toThrow();
  });
});
