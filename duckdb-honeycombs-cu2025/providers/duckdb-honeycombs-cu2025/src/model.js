/* 🌍 Integración de ficheros Parquet en ArcGIS REST API a través de DuckDB
   📅 Conferencia de Usuarios Esri España 2025
   👨‍💻 Autor: Raúl Martínez Fernández
   🕓 Fecha: Octubre 2025
*/

const koopConfig = require("config");
const duckdb = require("duckdb");
const fs = require("fs");

// 🧩 Funciones auxiliares para transformar y validar datos
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
      // ✅ Validar la configuración de Koop y DuckDB antes de iniciar
      validateConfig(koopConfig);
    } catch (error) {
      throw error;
    }

    // 🦆 Crear base de datos DuckDB en memoria
    this.db = new duckdb.Database(":memory:");

    // ⚙️ Cargar la configuración de la fuente localParquet definida en config/default.json
    const localParquetConfig = koopConfig.duckdb.sources.localParquet;
    var localParquetCreateClause = ``;

    // 🧱 Si existe configuración, generar la tabla virtual a partir del fichero Parquet
    if (localParquetConfig) {
      /* 📝 SQL EXPLICACIÓN:
         - Crea una tabla (por ejemplo, "taxi_positions") dentro de DuckDB.
         - Lee directamente los datos del fichero Parquet usando `read_parquet()`.
         - Convierte cada fila en una geometría espacial (punto) con ST_GeomFromText().
         - Añade un campo autoincremental `row_number()` para usar como OBJECTID.
         - Convierte `taxi_id` a texto para evitar problemas de tipos.
      */
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

    // 🚀 Inicializar extensiones espaciales y la librería H3 en DuckDB
    /* 🔍 EXPLICACIÓN:
       - INSTALL/LOAD spatial → activa funciones geométricas: ST_X, ST_Y, ST_GeomFromText, ST_Envelope_Agg, etc.
       - INSTALL/LOAD h3 → habilita funciones hexagonales como h3_latlng_to_cell() y h3_cell_to_boundary_wkt().
       - Luego ejecuta el CREATE TABLE anterior si existe.
    */
    const initQuery = `
      INSTALL spatial; 
      LOAD spatial; 
      INSTALL h3 FROM community; 
      LOAD h3;
      ${localParquetCreateClause}
    `;

    // 🏁 Ejecutar inicialización y mostrar mensaje
    this.db.all(initQuery, function (err, res) {
      if (err) {
        console.error(err);
      }
      console.log(`🦆 DuckDB initialized with ${res[0].Count} rows 🦆`);
    });
  }

  // 📡 Método principal para obtener los datos desde DuckDB
  getData(req, callback) {
    try {
      // 🔍 Convertir parámetros booleanos enviados como texto (true/false)
      Object.keys(req.query).forEach((key) => {
        if (req.query[key] + "".toLowerCase() === "true") req.query[key] = true;
        else if (req.query[key] + "".toLowerCase() === "false") req.query[key] = false;
      });

      const { query: geoserviceParams } = req;
      const { resultRecordCount, returnCountOnly } = geoserviceParams;
      const config = koopConfig["duckdb"];
      const sourceId = req.params.id;
      const sourceConfig = config.sources[sourceId];

      // 🧭 Determinar si la solicitud es solo de metadatos (sin datos)
      const isMetadataRequest =
        (Object.keys(geoserviceParams).length == 1 &&
          geoserviceParams.hasOwnProperty("f")) ||
        Object.keys(geoserviceParams).length == 0;

      const fetchSize = isMetadataRequest
        ? 1
        : resultRecordCount || sourceConfig.maxRecordCountPerPage;

      // 🧮 Determinar la resolución H3 (se puede pasar como parámetro &h3res=8, etc.)
      const h3Resolution = geoserviceParams.h3res || 9;

      // 🚕 Si se pasa un taxi_id, aplicar filtro
      let filterClause = "";
      if (geoserviceParams.taxi_id) {
        const taxiId = geoserviceParams.taxi_id.replace(/'/g, "''"); // evitar inyección SQL
        filterClause = `WHERE taxi_id = '${taxiId}'`;
        //console.log(`🚕 Aplicando filtro taxi_id: ${filterClause}`);
      }

      /* 🧱 SQL PRINCIPAL EXPLICACIÓN:

         1️⃣ Subconsulta interna:
             - Toma cada punto de la tabla original (por ejemplo, posición GPS de un taxi).
             - Usa h3_latlng_to_cell(lat, lon, resolución) → genera el ID del hexágono H3 que contiene ese punto.
             - El resultado es una lista de IDs de celdas H3 donde hay al menos un punto.

         2️⃣ Consulta externa:
             - Agrupa por cada h3_id (cada hexágono).
             - Cuenta cuántos puntos cayeron en cada celda → COUNT(*)
             - Convierte cada h3_id a un polígono usando h3_cell_to_boundary_wkt() y luego ST_GeomFromText().
             - Finalmente lo pasa a GeoJSON con ST_AsGeoJSON() → formato listo para ArcGIS/GeoJSON.

         3️⃣ Resultado:
             - Devuelve un objeto por celda H3, con su geometría (hexágono) y un atributo `point_count`.
      */
      const sqlQuery = `
        SELECT
          CAST(row_number() OVER () AS INTEGER) AS OBJECTID,  -- 🔹 Identificador OID para Esri
          CAST(COUNT(*) AS INTEGER) AS point_count,           -- 🔸 Número de puntos dentro del hexágono
          ST_AsGeoJSON(
            ST_GeomFromText(h3_cell_to_boundary_wkt(h3_id))  -- 🔺 Hexágono H3 en formato GeoJSON
          ) AS ${sourceConfig.geomOutColumn}
        FROM (
          SELECT
            h3_latlng_to_cell(
              ST_Y(${sourceConfig.geomOutColumn}),  -- coordenada Y (latitud)
              ST_X(${sourceConfig.geomOutColumn}),  -- coordenada X (longitud)
              ${h3Resolution}                       -- resolución H3
            ) AS h3_id
          FROM ${sourceConfig.properties.name}
          ${filterClause}
        )
        GROUP BY h3_id;
      `;

      // 🗺️ Si solo se piden metadatos, calcular la extensión espacial del dataset
      /* 🔍 EXPLICACIÓN:
         - ST_Envelope_Agg() calcula el bounding box (mínimo rectángulo que cubre todas las geometrías).
         - ST_AsGeoJSON lo devuelve en formato GeoJSON.
         - Se usa para devolver el extent en la respuesta REST.
      */
      var dbExtent = null;
      if (isMetadataRequest) {
        const extentQuery = `
          SELECT 
            ST_AsGeoJSON(ST_Envelope_Agg(${sourceConfig.geomOutColumn})) AS extent 
          FROM ${sourceConfig.properties.name}
        `;
        this.db.all(extentQuery, (err, rows) => {
          if (err) {
            console.error(err);
            return;
          }
          dbExtent = getExtentFromGeoJson(
            JSON.parse(rows[0]["extent"]),
            sourceConfig.dbWKID
          );
        });
      }

      // 🧾 Ejecutar la consulta principal y devolver resultados en GeoJSON
      this.db.all(sqlQuery, (err, rows) => {
        let geojson = { type: "FeatureCollection", features: [] };

        if (err) {
          console.error(err);
          callback(null, geojson);
        }

        // ⚠️ Si no hay resultados, devolver colección vacía
        if (rows.length == 0) {
          return callback(null, geojson);
        }

        // 📊 Si solo se pide el conteo
        if (returnCountOnly) {
          geojson.count = Number(rows[0]["count(1)"]);
        } else {
          // 🗺️ Convertir las filas SQL a formato GeoJSON
          geojson = translateToGeoJSON(rows, sourceConfig);
        }

        // 🧮 Añadir información sobre filtros aplicados
        geojson.filtersApplied = generateFiltersApplied(
          geoserviceParams,
          sourceConfig.idField,
          sourceConfig.geomOutColumn
        );

        // 🧾 Añadir metadatos del servicio
        geojson.metadata = {
          ...sourceConfig.properties,
          maxRecordCount: sourceConfig.maxRecordCountPerPage,
          idField: sourceConfig.idField,
          ...(dbExtent && { extent: dbExtent }),
        };

        // ⏱️ Tiempo de vida en caché (TTL = 1 hora)
        geojson.ttl = 3600;

        // 🧭 Definir sistema de referencia espacial (CRS EPSG)
        geojson.crs = {
          type: `${sourceConfig.dbWKID}`,
          properties: {
            name: `urn:ogc:def:crs:EPSG::${sourceConfig.dbWKID}`,
          },
        };

        // ✅ Enviar respuesta final al cliente (GeoJSON válido)
        callback(null, geojson);
      });
    } catch (error) {
      console.error(error);
      callback(null, { type: "FeatureCollection", features: [] });
    }
  }
}

module.exports = Model;
