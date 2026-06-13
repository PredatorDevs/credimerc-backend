const {
  inviteCompanyUserSchema,
  updateCompanyUserSchema,
  listCompanyUsersQuerySchema
} = require('./companyUsers.validation');
const companyUsersService = require('./companyUsers.service');
const { recordAudit } = require('../../lib/auditLog');

function extractClientContext(req) {
  return {
    ipAddress: req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null
  };
}

function parseSchema(schema, data, res) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Validation failed.',
      details: parsed.error.flatten()
    });
    return null;
  }

  return parsed.data;
}

async function listCompanyUsers(req, res, next) {
  try {
    const query = parseSchema(listCompanyUsersQuerySchema, req.query, res);
    if (!query) return;

    const data = await companyUsersService.listCompanyUsers({
      companyId: req.auth.activeCompanyId,
      query
    });

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function inviteCompanyUser(req, res, next) {
  try {
    const payload = parseSchema(inviteCompanyUserSchema, req.body, res);
    if (!payload) return;

    const data = await companyUsersService.inviteCompanyUser({
      companyId: req.auth.activeCompanyId,
      payload
    });

    const { ipAddress, userAgent } = extractClientContext(req);
    await recordAudit({
      companyId: req.auth.activeCompanyId,
      userId: req.auth.userId,
      companyUserId: req.auth.companyUserId,
      action: 'COMPANY_USER_INVITED',
      entityType: 'company_users',
      entityId: data?.id || null,
      oldValues: null,
      newValues: data,
      ipAddress,
      userAgent
    });

    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
}

async function updateCompanyUser(req, res, next) {
  try {
    const payload = parseSchema(updateCompanyUserSchema, req.body, res);
    if (!payload) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Invalid company user id.'
      });
    }

    const previous = await companyUsersService.getCompanyUserById({
      companyId: req.auth.activeCompanyId,
      id
    });

    const data = await companyUsersService.updateCompanyUser({
      companyId: req.auth.activeCompanyId,
      id,
      payload,
      actorCompanyUserId: req.auth.companyUserId
    });

    if (!data) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Company user not found.'
      });
    }

    const { ipAddress, userAgent } = extractClientContext(req);
    await recordAudit({
      companyId: req.auth.activeCompanyId,
      userId: req.auth.userId,
      companyUserId: req.auth.companyUserId,
      action: 'COMPANY_USER_UPDATED',
      entityType: 'company_users',
      entityId: id,
      oldValues: previous,
      newValues: data,
      ipAddress,
      userAgent
    });

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function removeCompanyUser(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Invalid company user id.'
      });
    }

    const previous = await companyUsersService.getCompanyUserById({
      companyId: req.auth.activeCompanyId,
      id
    });

    const ok = await companyUsersService.removeCompanyUser({
      companyId: req.auth.activeCompanyId,
      id,
      actorCompanyUserId: req.auth.companyUserId
    });

    if (!ok) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Company user not found.'
      });
    }

    const { ipAddress, userAgent } = extractClientContext(req);
    await recordAudit({
      companyId: req.auth.activeCompanyId,
      userId: req.auth.userId,
      companyUserId: req.auth.companyUserId,
      action: 'COMPANY_USER_REMOVED',
      entityType: 'company_users',
      entityId: id,
      oldValues: previous,
      newValues: { status: 'REMOVED' },
      ipAddress,
      userAgent
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listCompanyUsers,
  inviteCompanyUser,
  updateCompanyUser,
  removeCompanyUser
};
