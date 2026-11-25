const fetch = require('node-fetch');

function Model(koop) {}

Model.prototype.getData = function (req, callback) {
  const url = "https://notebook-tec.esrilab.es:8888/v2/entities";

  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

  // Make HTTP GET request to the endpoint
  fetch(url)
    .then(resp => {
      if (!resp.ok) {
        const status = resp.status;
        const statusText = resp.statusText;
        throw new Error(`Request to ${url} failed; ${status}, ${statusText}.`);
      }
      return resp.json();
    })
    .then(json => {
      // Initialize GeoJSON object
      const geojson = {
        type: "FeatureCollection",
        features: [],
        metadata: {
          name: "Integracion con FIWARE",
          idField: "id",
          geometryType: "Point",
          description: "Prueba de integracion con Orion Context Broker",
        },
      };

      console.log("-----------------------------------------")
      console.log(JSON.stringify(json))
      console.log("-----------------------------------------")

      // Iterate over each context element in the JSON response
      json.forEach(contextElement => {
        const properties = {};

        // Extract properties dynamically from the context element
        Object.keys(contextElement).forEach(key => {
          const value = contextElement[key].value;
          properties[key] = value;
        });

        // Extract location coordinates
        const location = contextElement.location.value.coordinates;

        // Construct GeoJSON feature
        const feature = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: location
          },
          properties: properties
        };

        // Add feature to GeoJSON features array
        geojson.features.push(feature);
      });

      // Invoke the callback with the GeoJSON object
      callback(null, geojson);
    })
    .catch(callback);
};

module.exports = Model;
