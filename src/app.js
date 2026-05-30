const express = require('express');
const filesRoutes = require('./modules/files/files.routes');

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, service: 'credimerc-backend' });
});

app.use('/api/files', filesRoutes);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const message = err?.message || 'Unexpected error.';
  return res.status(500).json({ error: 'INTERNAL_ERROR', message });
});

module.exports = app;
