module.exports = function authorize(permission) {
  return function permissionGuard(req, res, next) {
    const permissions = req.auth?.permissions || [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Falta el permiso requerido.' });
    }
    return next();
  };
};
