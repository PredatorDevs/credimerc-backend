const jwt = require('jsonwebtoken');
const env = require('../config/env');

module.exports = function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing bearer token.' });
  }

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret, {
      issuer: env.jwtIssuer,
      audience: env.jwtAudience
    });

    req.auth = {
      userId: payload.user_id,
      companyUserId: payload.company_user_id,
      activeCompanyId: payload.active_company_id,
      userStatus: payload.user_status || 'ACTIVE',
      companyUserStatus: payload.company_user_status || 'ACTIVE',
      permissions: Array.isArray(payload.permissions) ? payload.permissions : []
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid token.' });
  }
};
