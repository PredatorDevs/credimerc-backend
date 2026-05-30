const express = require('express');
const authRoutes = require('./modules/auth/auth.routes');
const filesRoutes = require('./modules/files/files.routes');
const companiesRoutes = require('./modules/companies/companies.routes');

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, service: 'credimerc-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/companies', companiesRoutes);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const message = err?.message || 'Unexpected error.';
  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  return res.status(statusCode).json({
    error: statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
    message
  });
});

module.exports = app;
