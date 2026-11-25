const _ = require('lodash');
const transformToEsriProperties = require('./transform-to-esri-properties');

function selectFieldsToEsriAttributes(
  properties,
  geometry,
  delimitedFields,
  dateFields,
  requires_fIdGeneration,
  idFieldDefinition,
) {
  const transformedProperties = transformToEsriProperties(
    properties,
    geometry,
    dateFields,
    requires_fIdGeneration,
    idFieldDefinition,
  );
  const fields = delimitedFields.split(',');
  return _.pick(transformedProperties, fields);
}

module.exports = selectFieldsToEsriAttributes;
