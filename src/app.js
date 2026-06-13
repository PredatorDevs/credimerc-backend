const express = require('express');
const responseEnvelope = require('./middlewares/responseEnvelope');
const authRoutes = require('./modules/auth/auth.routes');
const filesRoutes = require('./modules/files/files.routes');
const companiesRoutes = require('./modules/companies/companies.routes');
const companyUsersRoutes = require('./modules/company-users/companyUsers.routes');
const rbacRoutes = require('./modules/rbac/rbac.routes');
const customersRoutes = require('./modules/customers/customers.routes');
const loansRoutes = require('./modules/loans/loans.routes');
const paymentsRoutes = require('./modules/payments/payments.routes');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(responseEnvelope);

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, service: 'credimerc-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/company-users', companyUsersRoutes);
app.use('/api', rbacRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api', paymentsRoutes);

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
