function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

module.exports = function responseEnvelope(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    if (res.locals.__skipEnvelope) {
      return originalJson(payload);
    }

    if (isPlainObject(payload) && (payload.success !== undefined || payload.data !== undefined)) {
      return originalJson(payload);
    }

    const status = res.statusCode || 200;

    if (status >= 400) {
      const errorPayload = isPlainObject(payload) ? payload : { message: String(payload) };
      return originalJson({
        success: false,
        error: errorPayload.error || 'REQUEST_ERROR',
        message: errorPayload.message || 'Request failed.',
        details: errorPayload.details || null
      });
    }

    return originalJson({
      success: true,
      data: payload,
      message: null,
      meta: null
    });
  };

  next();
};
