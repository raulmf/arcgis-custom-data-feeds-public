const _ = require('lodash');
const envelope = require('@turf/envelope').default;
const logManager = require('../log-manager');
const defaults = require('../metadata-defaults');
const normalizeSourceDataSpatialReference = require('./source-data-spatial-reference');
const getGeometryTypeFromGeojson = require('./get-geometry-type-from-geojson');
const { normalizeCapabilities } = require('./normalize-capabilities');
const { LayerFields } = require('./fields');
const normalizeExtent = require('./normalize-extent');

const defaultWgs84Extent = {
  spatialReference: {
    latestWkid: 4326,
    wkid: 4326,
  },
  xmax: 180,
  xmin: -180,
  ymax: 90,
  ymin: -90,
};

function extractDatasetMetadata(providerData) {
  const { features = [], crs, metadata = {}, ...rest } = providerData;
  const count = Number.isInteger(providerData.count) ? providerData.count :features.length;
  const propertiesSample = _.get(features, '[0].properties') || {};
  const idField = metadata.idField;
  const hasOwnObjectId = _.isSafeInteger(propertiesSample['OBJECTID']);
  const hasDefinedUniqueIdentifier = !!idField;
  const hasComplientUniqueIdentifier = _.isSafeInteger(propertiesSample[idField]);

  const uniqueIdKey = getUniqueIdentifier(
    idField,
    hasComplientUniqueIdentifier,
    metadata.idFieldAsString,
    hasOwnObjectId,
  );

  const requires_fIdGeneration = shouldGenerateFId(
    hasDefinedUniqueIdentifier,
    hasComplientUniqueIdentifier,
    metadata.idFieldAsString,
    hasOwnObjectId,
  );
  const dataCrs = normalizeSourceDataSpatialReference({
    dataCrs: metadata.dataCrs || metadata.inputCrs || metadata.sourceSR,
    crs: crs || metadata.crs,
  });

  const dataSpatialReference = dataCrs.export();
  const extent = getExtent(metadata.extent, providerData, dataSpatialReference);
  const initialExtent = metadata.initialExtent
    ? { ...metadata.initialExtent, spatialReference: dataSpatialReference }
    : extent;
  const fullExtent = metadata.fullExtent
    ? { ...metadata.fullExtent, spatialReference: dataSpatialReference }
    : extent;
  const geometryType = getGeometryTypeFromGeojson({ metadata, features });
  const capabilities = normalizeCapabilities(providerData);
  const fields = LayerFields.create(metadata.fields, propertiesSample, uniqueIdKey);
  const maxRecordCount = metadata.maxRecordCount || defaults.maxRecordCount();
  const supportedQueryFormats = getSupportedQueryFormats(metadata.supportedQueryFormats);
  const resourceType = getResourceType(geometryType, metadata.orientedImageryInfo);

  return {
    count,
    filtersApplied: {},
    ...metadata,
    ...rest,
    geometryType,
    uniqueIdKey,
    requires_fIdGeneration,
    attributeSample: propertiesSample,
    dataCrs,
    dataSpatialReference,
    capabilities,
    fields,
    rawFieldDefinitions: metadata.fields || [],
    maxRecordCount,
    extent,
    initialExtent,
    fullExtent,
    supportedQueryFormats,
    resourceType,
    hasOwnObjectId,
    idFieldDefinition: idField || null,
  };
}

function getUniqueIdentifier(idField, hasComplientUniqueIdentifier, idFieldAsString) {
  // use defined unique identifier
  if (idField && (hasComplientUniqueIdentifier || idFieldAsString)) {
    return idField;
  }

  // Use the native OBJECTID
  return 'OBJECTID';
}

function shouldGenerateFId(
  hasDefinedUniqueId,
  hasComplientUniqueId,
  idFieldAsString,
  hasOwnObjectId,
) {
  if (hasComplientUniqueId || (hasDefinedUniqueId && idFieldAsString) || hasOwnObjectId) {
    return false;
  }

  return true;
}

function getExtent(metadataExtent, featureCollection, spatialReference) {
  return normalizeExtent({
    ...(metadataExtent || calculateExtentFromFeatures(featureCollection) || defaultWgs84Extent),
    spatialReference,
  });
}

function calculateExtentFromFeatures(featureCollection, spatialReference) {
  if (!featureCollection.features || featureCollection.features.length === 0) {
    return;
  }

  try {
    const { bbox } = envelope(featureCollection);

    bbox.forEach((coordinate) => {
      if (!isFinite(coordinate)) {
        throw new Error(`Feature does not contain valid geometry`);
      }
    });

    const [xmin, ymin, xmax, ymax] = bbox;
    return {
      xmin,
      xmax,
      ymin,
      ymax,
      spatialReference,
    };
  } catch (error) {
    logManager.logger.debug(`Could not calculate extent from data: ${error.message}`);
  }
}

function getSupportedQueryFormats(supportedQueryFormats) {
  if (Array.isArray(supportedQueryFormats)) {
    return supportedQueryFormats.join(',');
  }

  return supportedQueryFormats;
}

function getResourceType(geometryType, orientedImageryInfo) {
  if (geometryType) {
    return orientedImageryInfo ? 'Oriented Imagery Layer' : 'Feature Layer';
  }
  return 'Table';
}
module.exports = { extractDatasetMetadata };
