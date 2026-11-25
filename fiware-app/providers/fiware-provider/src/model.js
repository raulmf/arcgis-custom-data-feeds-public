const _ = require('lodash');
const fetch = require('node-fetch');

function Model(koop) {}

// ejecuta llamadas REST
Model.prototype.getData = function (req, callback) {

  // URL para recuperar entidades de Orion, se hace a traves de un reverse proxy ya que
  //el docker de orion trabajan en modo https pero portal requiere https. Es version v2
  const url = "https://notebook-tec.esrilab.es:8888/v2/entities";

  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

  //POST a endpoint de orion v2
  fetch(url, {
    method: 'GET'
  })
    .then((resp) => {
      if (!resp.ok) {
        const status = resp.status;
        const statusText = resp.statusText;
        throw new Error(`Request to ${url} failed; ${status}, ${statusText}.`);
      }
      return resp.json();
    })
    .then((json) => {
      // el json que devuelve la api hay que parsearlo a json
      //console.log(json)
      var geojson = {
        type: "FeatureCollection",
        features: [],
        // set layer name
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

      for (let i = 0; i < json.length; i++) {
        const contextElement = json[i];       
        const id = contextElement.id;    
        const name = contextElement.name.value;
        const humidity = contextElement.humidity.value.percentage;
        const temperature = contextElement.temperature.value.degreeCentigrade
        const location = contextElement.location.value.coordinates
        console.log(temperature)

        geojson.features.push({
          "type": "Feature",
          "geometry": {
          "type": "Point",
          "coordinates": location
  },
          properties: {
            id: id,
            name: name,
            humidity: humidity,
            temperature: temperature,
          },
      
        });

        //console.log(JSON.stringify(geojson))
      }

      callback(null, geojson);
    })
    // Handle any errors
    .catch(callback);
};

module.exports = Model;

