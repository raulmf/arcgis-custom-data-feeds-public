const _ = require('lodash');
const { getDataTypeFromValue } = require('../helpers');
const logManager = require('../log-manager');

function logProviderDataWarnings(normalizedMetadata, requestParams, hasFeatures) {
  let { outFields } = requestParams;
  outFields = outFields === '*' ? null : outFields;

  if (!hasFeatures) {
    return;
  }

  if (!normalizedMetadata.idField && !normalizedMetadata.hasOwnObjectId) {
    logManager.logger.debug(
      `provider data has no OBJECTID and has no "idField" assignment. You will get the most reliable behavior from ArcGIS clients if the provider assigns the "idField" to a property that is an integer in range 0 - ${Number.MAX_SAFE_INTEGER}. An OBJECTID field will be auto-generated in the absence of an "idField" assignment.`, // eslint-disable-line
    );
  }

  if (hasMixedCaseObjectIdKey(normalizedMetadata.idField)) {
    logManager.logger.debug(
      'requested provider has "idField" that is a mixed-case version of "OBJECTID". This can cause errors in ArcGIS clients.', // eslint-disable-line
    );
  }

  if (normalizedMetadata.rawFieldDefinitions) {
    const fieldDefinitions = getFieldsDefinitionsForResponse(
      normalizedMetadata.rawFieldDefinitions,
      outFields,
    );

    compareFieldDefintionsToFieldType(fieldDefinitions, normalizedMetadata.attributeSample);

    compareFeatureToFieldDefinitions(normalizedMetadata.attributeSample, fieldDefinitions);
  }
}

function hasMixedCaseObjectIdKey(idField = '') {
  return idField.toLowerCase() === 'objectid' && idField !== 'OBJECTID';
}

function getFieldsDefinitionsForResponse(fields, outFields) {
  if (!outFields) {
    return fields;
  }

  return fields.filter((field) => {
    return outFields.includes(field.alias) || outFields.includes(field.name);
  });
}

function compareFieldDefintionsToFieldType(fieldDefinitions, featureProperties) {
  fieldDefinitions.forEach(({ name, type }) => {
    // look for a defined field in the features properties
    const featureField = featureProperties[name];

    if (featureField === undefined) {
      logManager.logger.debug(
        `Pre-defined field "${name} (${type})" not found in first feature of provider's GeoJSON`,
      );
      return;
    }
    if (hasTypeMismatch(type, featureField)) {
      logManager.logger.debug(
        `Pre-defined field "${name} (${type})" has a value that does match defined data type`,
      );
    }
  });
}

function compareFeatureToFieldDefinitions(featureProperties, fieldDefinitions) {
  Object.keys(featureProperties).forEach((key) => {
    const definition = _.find(fieldDefinitions, ['name', key]);

    if (!definition) {
      logManager.logger.debug(
        `requested provider has feature with property "${key}" that was not defined in metadata fields array`, // eslint-disable-line
      );
    }
  });
}

function hasTypeMismatch(definitionType, value) {
  const propertyType = getDataTypeFromValue(value);

  return (
    definitionType.toLowerCase() !== propertyType.toLowerCase() &&
    !isEsriTypeMatchException(definitionType, propertyType)
  );
}

function isEsriTypeMatchException(definitionType, propertyType) {
  if (['date', 'double', 'biginteger', 'bigint'].includes(definitionType.toLowerCase())) {
    return propertyType === 'Integer';
  }
}

module.exports = { logProviderDataWarnings };
