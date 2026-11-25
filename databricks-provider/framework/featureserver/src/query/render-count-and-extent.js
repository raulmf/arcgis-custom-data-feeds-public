function renderCountAndExtentResponse(count, extent, params) {
  const { returnCountOnly, returnExtentOnly } = params;

  if (returnCountOnly && returnExtentOnly) {
    return {
      count,
      extent,
    };
  }

  if (returnCountOnly) {
    return {
      count,
    };
  }

  return {
    extent,
  };
}

module.exports = { renderCountAndExtentResponse };
