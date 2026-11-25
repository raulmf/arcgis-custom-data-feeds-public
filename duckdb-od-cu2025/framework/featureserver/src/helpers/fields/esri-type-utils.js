const { getDataTypeFromValue } = require('../data-type-utils');
const {
  ESRI_FIELD_TYPE_STRING,
  ESRI_FIELD_TYPE_DATE,
  ESRI_FIELD_TYPE_DOUBLE,
  SQL_TYPE_FLOAT,
  SQL_TYPE_INTEGER,
  SQL_TYPE_OTHER,
} = require('./constants');

function getEsriTypeFromDefinition(typeDefinition = '') {
  switch (typeDefinition.toLowerCase()) {
    case 'double':
    case 'number':
      return ESRI_FIELD_TYPE_DOUBLE;
    case 'integer':
      return 'esriFieldTypeInteger';
    case 'date':
      return ESRI_FIELD_TYPE_DATE;
    case 'blob':
      return 'esriFieldTypeBlob';
    case 'geometry':
      return 'esriFieldTypeGeometry';
    case 'globalid':
      return 'esriFieldTypeGlobalID';
    case 'guid':
      return 'esriFieldTypeGUID';
    case 'raster':
      return 'esriFieldTypeRaster';
    case 'single':
      return 'esriFieldTypeSingle';
    case 'smallinteger':
      return 'esriFieldTypeSmallInteger';
    case 'biginteger':
    case 'bigint':
      return 'esriFieldTypeBigInteger';
    case 'xml':
      return 'esriFieldTypeXML';
    case 'string':
    default:
      return ESRI_FIELD_TYPE_STRING;
  }
}

function getEsriTypeFromValue(value) {
  const dataType = getDataTypeFromValue(value);

  return getEsriTypeFromDefinition(dataType);
}

function getSqlTypeFromDefinition(typeDefinition = '') {
  switch (typeDefinition.toLowerCase()) {
    case 'double':
    case 'number':
      return SQL_TYPE_FLOAT;
    case 'integer':
      return SQL_TYPE_INTEGER;
    case 'date':
      return 'sqlTypeTimestamp2';
    case 'string':
    case 'globalid':
      return 'sqlTypeNVarchar';
    case 'smallinteger':
      return 'sqlTypeSmallInt';
    case 'biginteger':
    case 'bigint':
      return 'sqlTypeBigInt';
    default:
      return SQL_TYPE_OTHER;
  }
}

function getSqlTypeFromValue(value) {
  const dataType = getDataTypeFromValue(value);

  return getSqlTypeFromDefinition(dataType);
}

module.exports = {
  getEsriTypeFromDefinition,
  getEsriTypeFromValue,
  getSqlTypeFromDefinition,
  getSqlTypeFromValue,
};
