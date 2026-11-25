/* Integración de ficheros parquet en ArcGIS REST API a través de DuckDB 
   Conferencia de Usuarios Esri España 2025
    Autor: Raúl Martínez Fernández  
    Fecha: Octubre 2025
*/

const koopConfig = require("config");
const duckdb = require("duckdb");
const fs = require("fs");
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

    var localParquetCreateClause = ``;

    console.log(localParquetConfig)
if (localParquetConfig) {
  localParquetCreateClause = `
    CREATE TABLE ${localParquetConfig.properties.name} AS 
    SELECT 
      CAST(taxi_id AS VARCHAR) AS taxi_id,
      timestamp,
      ST_GeomFromText(source_point) AS ${localParquetConfig.geomOutColumn},
      CAST(row_number() OVER () AS INTEGER) AS ${localParquetConfig.idField}
    FROM read_parquet('${localParquetConfig.path}', hive_partitioning = true);
  `;
} 

console.log(localParquetCreateClause);

    const initQuery = `INSTALL spatial; LOAD spatial; 
            ${localParquetCreateClause}`;
    this.db.all(initQuery, function (err, res) {
      if (err) {
        console.error(err);
      }
      console.log(`🦆 DuckDB initialized with ${res[0].Count} rows 🦆`);
    });
  }

  getData(req, callback) {
    try {
      // convert bools from strings
      Object.keys(req.query).forEach((key) => {
        if (req.query[key] + "".toLowerCase() === "true") req.query[key] = true;
        else if (req.query[key] + "".toLowerCase() === "false")
          req.query[key] = false;
      });
      const { query: geoserviceParams } = req;
      // TODO: speed up returnIdsOnly with large datasets
      const { resultRecordCount, returnCountOnly } = geoserviceParams;
      const config = koopConfig["duckdb"];
      const sourceId = req.params.id;
      const sourceConfig = config.sources[sourceId];
      // only return back one row for metadata purposes
      const isMetadataRequest =
        (Object.keys(geoserviceParams).length == 1 &&
          geoserviceParams.hasOwnProperty("f")) ||
        Object.keys(geoserviceParams).length == 0;
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

      var dbExtent = null;
      if (isMetadataRequest) {
        const extentQuery = `SELECT ST_AsGeoJSON(ST_Envelope_Agg(${sourceConfig.geomOutColumn})) AS extent FROM ${sourceConfig.properties.name}`;
        this.db.all(extentQuery, (err, rows) => {
          if (err) {
            console.error(err);
            return;
          }
          dbExtent = getExtentFromGeoJson(JSON.parse(rows[0]["extent"]), sourceConfig.dbWKID);
        });
      }

      this.db.all(sqlQuery, (err, rows) => {
        let geojson = { type: "FeatureCollection", features: [] };
        if (err) {
          console.error(err);
          callback(null, geojson);
        }
        if (rows.length == 0) {
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
        geojson.crs = {
          type: `${sourceConfig.dbWKID}`,
          properties: {
            name: `urn:ogc:def:crs:EPSG::${sourceConfig.dbWKID}`,
          },
        };
        callback(null, geojson);
      });
    } catch (error) {
      console.error(error);
      callback(null, { type: "FeatureCollection", features: [] });
    }
  }
}

module.exports = Model;

