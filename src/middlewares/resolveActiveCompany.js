module.exports = function resolveActiveCompany(req, res, next) {
  const activeCompanyId = req.auth?.activeCompanyId;
  if (!activeCompanyId) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'No active company selected.' });
  }

  req.company = { id: activeCompanyId };
  return next();
};
