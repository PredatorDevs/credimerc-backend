const {
  listPermissionsQuerySchema,
  listRolesQuerySchema,
  createRoleSchema,
  updateRoleSchema,
  setRolePermissionsSchema,
  setCompanyUserRolesSchema
} = require('./rbac.validation');
const rbacService = require('./rbac.service');
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

function parseNumericId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function listPermissions(req, res, next) {
  try {
    const query = parseSchema(listPermissionsQuerySchema, req.query, res);
    if (!query) return;

    const items = await rbacService.listPermissions({ query });
    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
}

async function listRoles(req, res, next) {
  try {
    const query = parseSchema(listRolesQuerySchema, req.query, res);
    if (!query) return;

    const items = await rbacService.listRoles({
      companyId: req.auth.activeCompanyId,
      query
    });

    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
}

async function createRole(req, res, next) {
  try {
    const payload = parseSchema(createRoleSchema, req.body, res);
    if (!payload) return;

    const data = await rbacService.createRole({
      companyId: req.auth.activeCompanyId,
      payload
    });

    const { ipAddress, userAgent } = extractClientContext(req);
    await recordAudit({
      companyId: req.auth.activeCompanyId,
      userId: req.auth.userId,
      companyUserId: req.auth.companyUserId,
      action: 'ROLE_CREATED',
      entityType: 'roles',
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

async function updateRole(req, res, next) {
  try {
    const payload = parseSchema(updateRoleSchema, req.body, res);
    if (!payload) return;

    const id = parseNumericId(req.params.id);
    if (!id) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Invalid role id.'
      });
    }

    const previous = await rbacService.getRoleById({
      companyId: req.auth.activeCompanyId,
      id
    });

    const data = await rbacService.updateRole({
      companyId: req.auth.activeCompanyId,
      id,
      payload
    });

    if (!data) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Role not found.'
      });
    }

    const { ipAddress, userAgent } = extractClientContext(req);
    await recordAudit({
      companyId: req.auth.activeCompanyId,
      userId: req.auth.userId,
      companyUserId: req.auth.companyUserId,
      action: 'ROLE_UPDATED',
      entityType: 'roles',
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

async function deleteRole(req, res, next) {
  try {
    const id = parseNumericId(req.params.id);
    if (!id) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Invalid role id.'
      });
    }

    const previous = await rbacService.getRoleById({
      companyId: req.auth.activeCompanyId,
      id
    });

    const ok = await rbacService.deleteRole({
      companyId: req.auth.activeCompanyId,
      id
    });

    if (!ok) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Role not found.'
      });
    }

    const { ipAddress, userAgent } = extractClientContext(req);
    await recordAudit({
      companyId: req.auth.activeCompanyId,
      userId: req.auth.userId,
      companyUserId: req.auth.companyUserId,
      action: 'ROLE_DELETED',
      entityType: 'roles',
      entityId: id,
      oldValues: previous,
      newValues: null,
      ipAddress,
      userAgent
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function setRolePermissions(req, res, next) {
  try {
    const payload = parseSchema(setRolePermissionsSchema, req.body, res);
    if (!payload) return;

    const roleId = parseNumericId(req.params.id);
    if (!roleId) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Invalid role id.'
      });
    }

    const data = await rbacService.setRolePermissions({
      companyId: req.auth.activeCompanyId,
      roleId,
      permissionIds: payload.permissionIds
    });

    const { ipAddress, userAgent } = extractClientContext(req);
    await recordAudit({
      companyId: req.auth.activeCompanyId,
      userId: req.auth.userId,
      companyUserId: req.auth.companyUserId,
      action: 'ROLE_PERMISSIONS_UPDATED',
      entityType: 'roles',
      entityId: roleId,
      oldValues: null,
      newValues: { permissionIds: payload.permissionIds },
      ipAddress,
      userAgent
    });

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function setCompanyUserRoles(req, res, next) {
  try {
    const payload = parseSchema(setCompanyUserRolesSchema, req.body, res);
    if (!payload) return;

    const companyUserId = parseNumericId(req.params.id);
    if (!companyUserId) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Invalid company user id.'
      });
    }

    const data = await rbacService.setCompanyUserRoles({
      companyId: req.auth.activeCompanyId,
      companyUserId,
      roleIds: payload.roleIds
    });

    const { ipAddress, userAgent } = extractClientContext(req);
    await recordAudit({
      companyId: req.auth.activeCompanyId,
      userId: req.auth.userId,
      companyUserId: req.auth.companyUserId,
      action: 'COMPANY_USER_ROLES_UPDATED',
      entityType: 'company_users',
      entityId: companyUserId,
      oldValues: null,
      newValues: { roleIds: payload.roleIds },
      ipAddress,
      userAgent
    });

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listPermissions,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  setRolePermissions,
  setCompanyUserRoles
};
