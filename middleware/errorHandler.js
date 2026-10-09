// 404 for unknown routes
function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central handler: clean JSON, never leaks stack traces or database details.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  const status = err.status && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message
  });
}

module.exports = { notFound, errorHandler };
