const { generalResponseHandler } = require('../response-handlers');
const { renderPrecalculatedStatisticsResponse } = require('./render-precalculated-statistics');

function renderPredeterminedQueryResult(data, requestParams, res) {
  const { statistics, count, extent } = data;
  const { returnCountOnly, returnExtentOnly, outStatistics, groupByFieldsForStatistics } =
    requestParams;

  if (statistics) {
    const result = renderPrecalculatedStatisticsResponse(data, {
      outStatistics,
      groupByFieldsForStatistics,
    });
    return generalResponseHandler(res, result, requestParams);
  }

  const retVal = {};

  if (returnCountOnly) {
    retVal.count = count;
  }

  if (returnExtentOnly) {
    retVal.extent = extent;
  }

  return generalResponseHandler(res, retVal, requestParams);
}

module.exports = { renderPredeterminedQueryResult };
