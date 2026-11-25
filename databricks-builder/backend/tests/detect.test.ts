import { describe, expect, it } from "vitest";
import { detectSpatialConfiguration } from "../src/detection/detect.js";

describe("detectSpatialConfiguration", () => {
  it("detects native geometry and object id fields", () => {
    const result = detectSpatialConfiguration([
      { name: "objectid", dataType: "BIGINT" },
      { name: "shape", dataType: "GEOMETRY" }
    ]);

    expect(result.suggestedGeometryColumn).toBe("shape");
    expect(result.suggestedGeometryFormat).toBe("GEOMETRY");
    expect(result.suggestedIdField).toBe("objectid");
  });

  it("detects WKT with decimal commas", () => {
    const result = detectSpatialConfiguration(
      [
        { name: "gid", dataType: "INT" },
        { name: "geom_wkt", dataType: "STRING" }
      ],
      [{ gid: 1, geom_wkt: "POINT (2,123 41,456)" }]
    );

    expect(result.suggestedGeometryFormat).toBe("WKT_DECIMAL_COMMA");
    expect(result.geometryType).toBe("POINT");
  });

  it("detects GeoJSON geometry strings", () => {
    const result = detectSpatialConfiguration(
      [{ name: "geometry_json", dataType: "STRING" }],
      [{ geometry_json: JSON.stringify({ type: "Point", coordinates: [2.1, 41.4] }) }]
    );

    expect(result.suggestedGeometryFormat).toBe("GEOJSON");
  });
});
