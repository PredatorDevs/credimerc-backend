module.exports = function requireNotBanned(req, res, next) {
  const bannedStatuses = new Set(['BANNED', 'LOCKED', 'INACTIVE', 'SUSPENDED', 'REMOVED']);
  const userStatus = req.auth?.userStatus;
  const companyUserStatus = req.auth?.companyUserStatus;

  if (bannedStatuses.has(userStatus) || bannedStatuses.has(companyUserStatus)) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'User status does not allow this action.' });
  }

  return next();
};
