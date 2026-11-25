const _ = require('lodash');
const { fast1a52: createIntegerHash } = require('fnv-plus');

module.exports = function transformToEsriProperties(
  properties,
  geometry,
  delimitedDateFields,
  requires_fIdGeneration,
  idFieldDefinition,
) {
  requires_fIdGeneration = requires_fIdGeneration === 'true';
  idFieldDefinition = idFieldDefinition === 'null' ? null : idFieldDefinition;
  const dateFields = delimitedDateFields.split(',');

  if (idFieldDefinition && !properties?.[idFieldDefinition]) {
    throw new Error(
      `idField is set to "${idFieldDefinition}", but it does not exist as a property on all features.`,  // eslint-disable-line
    );
  }

  if (requires_fIdGeneration) {
    const _fId = getFIdHash({ properties, geometry }, idFieldDefinition);
    return transformProperties({ OBJECTID: _fId, ...properties }, dateFields);
  }

  return transformProperties(properties, dateFields);
};

function getFIdHash(feature, hashTargetKey) {
  const { properties, geometry } = feature;
  if (hashTargetKey) {
    return createIntegerHash(feature.properties[hashTargetKey]);
  }
  return createIntegerHash(JSON.stringify({ properties, geometry }));
}

function transformProperties(properties, dateFields) {
  return Object.entries(properties).reduce((transformedProperties, [key, value]) => {
    if (dateFields.includes(key)) {
      transformedProperties[key] = value === null ? null : new Date(value).getTime();
    } else if (_.isObject(value)) {
      transformedProperties[key] = JSON.stringify(value);
    } else {
      transformedProperties[key] = value;
    }
    return transformedProperties;
  }, {});
}
