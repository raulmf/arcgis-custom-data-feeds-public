/* 
   Integración de ficheros Parquet en ArcGIS REST API a través de DuckDB 
   Generación de líneas origen–destino (OD)
   Conferencia de Usuarios Esri España 2025
   Autor: Raúl Martínez Fernández  
   Fecha: Octubre 2025
*/

const koopConfig = require("config");
const duckdb = require("duckdb");
const path = require("path");
const {
  translateToGeoJSON,
  validateConfig,
  buildSqlQuery,
  generateFiltersApplied,
  getExtentFromGeoJson,
} = require("./modules");

class Model {
  constructor(koop) {
    try {
      validateConfig(koopConfig);
    } catch (error) {
      throw error;
    }

    this.db = new duckdb.Database(":memory:");
    const localParquetConfig = koopConfig.duckdb.sources.localParquet;
    if (!localParquetConfig) throw new Error("No localParquet config found.");

    const parquetPath = path.resolve(localParquetConfig.path);
    console.log(`📦 Loading Parquet: ${parquetPath}`);

    const createTableQuery = `
  INSTALL spatial;
  LOAD spatial;
  CREATE TABLE ${localParquetConfig.properties.name} AS 
  SELECT 
    CAST(taxi_id AS VARCHAR) AS taxi_id,
    CAST(trajectory_id AS VARCHAR) AS trajectory_id,
    timestamp,
    ST_MakeLine(
      ST_GeomFromText(source_point),
      ST_GeomFromText(target_point)
    ) AS ${localParquetConfig.geomOutColumn},
    ST_Length(
      ST_Transform(
        ST_MakeLine(
          ST_GeomFromText(source_point),
          ST_GeomFromText(target_point)
        ),
        'EPSG:4326',
        'EPSG:3857'
      )
    ) AS distance_meters,
    CAST(row_number() OVER () AS INTEGER) AS ${localParquetConfig.idField}
  FROM read_parquet('${parquetPath}', hive_partitioning = true)
  WHERE source_point IS NOT NULL AND target_point IS NOT NULL;
`;


    // Execute table creation in sequence
    this.db.run(createTableQuery, (err) => {
      if (err) {
        console.error("❌ Error initializing DuckDB:", err);
      } else {
        console.log("🦆 DuckDB table created with OD polylines 🦆");
      }
    });
  }

  async getData(req, callback) {
    try {
      // Normalize boolean params
      Object.keys(req.query).forEach((key) => {
        const val = String(req.query[key]).toLowerCase();
        if (val === "true") req.query[key] = true;
        else if (val === "false") req.query[key] = false;
      });

      const { query: geoserviceParams } = req;
      const config = koopConfig.duckdb;
      const sourceId = req.params.id;
      const sourceConfig = config.sources[sourceId];
      if (!sourceConfig) throw new Error(`No source config for id: ${sourceId}`);

      const { resultRecordCount, returnCountOnly } = geoserviceParams;

      // Detect metadata request
      const isMetadataRequest =
        (Object.keys(geoserviceParams).length === 1 &&
          geoserviceParams.hasOwnProperty("f")) ||
        Object.keys(geoserviceParams).length === 0;

      const fetchSize = isMetadataRequest
        ? 1
        : resultRecordCount || sourceConfig.maxRecordCountPerPage;

      const sqlQuery = buildSqlQuery(
        geoserviceParams,
        sourceConfig.idField,
        sourceConfig.geomOutColumn,
        sourceConfig.properties.name,
        sourceConfig.dbWKID,
        fetchSize
      );

      // Helper for extent
      const getExtentPromise = async () => {
        return new Promise((resolve, reject) => {
          const q = `SELECT ST_AsGeoJSON(ST_Envelope_Agg(${sourceConfig.geomOutColumn})) AS extent FROM ${sourceConfig.properties.name}`;
          this.db.all(q, (err, rows) => {
            if (err) return reject(err);
            if (!rows || !rows[0] || !rows[0].extent) return resolve(null);
            const extent = getExtentFromGeoJson(
              JSON.parse(rows[0].extent),
              sourceConfig.dbWKID
            );
            resolve(extent);
          });
        });
      };

      let dbExtent = null;
      if (isMetadataRequest) dbExtent = await getExtentPromise();

      // Run main query
      this.db.all(sqlQuery, (err, rows) => {
        if (err) {
          console.error("❌ SQL Error:", err);
          return callback(null, { type: "FeatureCollection", features: [] });
        }

        let geojson = { type: "FeatureCollection", features: [] };

        if (rows.length === 0) {
          return callback(null, geojson);
        }

        if (returnCountOnly) {
          geojson.count = Number(rows[0]["count(1)"]);
        } else {
          geojson = translateToGeoJSON(rows, sourceConfig);
        }

        geojson.filtersApplied = generateFiltersApplied(
          geoserviceParams,
          sourceConfig.idField,
          sourceConfig.geomOutColumn
        );

        geojson.metadata = {
          ...sourceConfig.properties,
          maxRecordCount: sourceConfig.maxRecordCountPerPage,
          idField: sourceConfig.idField,
          ...(dbExtent && { extent: dbExtent }),
        };

        // Note: CRS included for ArcGIS compatibility (non-standard for RFC 7946)
        geojson.crs = {
          type: `${sourceConfig.dbWKID}`,
          properties: {
            name: `urn:ogc:def:crs:EPSG::${sourceConfig.dbWKID}`,
          },
        };

        callback(null, geojson);
      });
    } catch (error) {
      console.error("❌ getData Error:", error);
      callback(null, { type: "FeatureCollection", features: [] });
    }
  }
}

module.exports = Model;
