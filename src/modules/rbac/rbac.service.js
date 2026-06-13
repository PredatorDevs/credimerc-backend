const db = require('../../lib/db');

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const trimmed = typeof value === 'string' ? value.trim() : value;
  return trimmed === '' ? null : trimmed;
}

function normalizeRequiredName(value) {
  const normalized = normalizeOptional(value);
  if (!normalized) {
    const error = new Error('Role name is required.');
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function toMapById(items) {
  const map = new Map();
  for (const item of items) {
    map.set(item.id, item);
  }
  return map;
}

async function listPermissions({ query }) {
  const filters = ['1 = 1'];
  const params = [];

  if (query.activeOnly !== false) {
    filters.push('p.is_active = 1');
  }

  if (query.q) {
    filters.push('(p.code LIKE ? OR p.module LIKE ? OR p.action LIKE ?)');
    const search = `%${query.q}%`;
    params.push(search, search, search);
  }

  const [rows] = await db.execute(
    `
      SELECT
        p.id,
        p.code,
        p.module,
        p.action,
        p.description,
        p.is_active,
        p.created_at
      FROM permissions p
      WHERE ${filters.join(' AND ')}
      ORDER BY p.module ASC, p.action ASC, p.code ASC
    `,
    params
  );

  return rows;
}

async function getRoleById({ companyId, id, connection = db }) {
  const [rows] = await connection.execute(
    `
      SELECT
        r.id,
        r.company_id,
        r.name,
        r.description,
        r.is_system,
        r.status,
        r.created_at,
        r.updated_at
      FROM roles r
      WHERE r.company_id = :companyId
        AND r.id = :id
      LIMIT 1
    `,
    { companyId, id }
  );

  return rows[0] || null;
}

async function listRoles({ companyId, query }) {
  const filters = ['r.company_id = ?'];
  const params = [companyId];

  if (query.status) {
    filters.push('r.status = ?');
    params.push(query.status);
  }

  const [roles] = await db.execute(
    `
      SELECT
        r.id,
        r.company_id,
        r.name,
        r.description,
        r.is_system,
        r.status,
        r.created_at,
        r.updated_at
      FROM roles r
      WHERE ${filters.join(' AND ')}
      ORDER BY r.is_system DESC, r.name ASC
    `,
    params
  );

  if (!roles.length) {
    return [];
  }

  const roleIds = roles.map((role) => role.id);
  const placeholders = roleIds.map(() => '?').join(', ');
  const [permissionRows] = await db.execute(
    `
      SELECT
        rp.role_id,
        p.id,
        p.code,
        p.module,
        p.action,
        p.description,
        p.is_active
      FROM role_permissions rp
      INNER JOIN permissions p
        ON p.id = rp.permission_id
      WHERE rp.company_id = ?
        AND rp.role_id IN (${placeholders})
      ORDER BY p.module ASC, p.action ASC, p.code ASC
    `,
    [companyId, ...roleIds]
  );

  const permissionMap = new Map();
  for (const row of permissionRows) {
    if (!permissionMap.has(row.role_id)) {
      permissionMap.set(row.role_id, []);
    }

    permissionMap.get(row.role_id).push({
      id: row.id,
      code: row.code,
      module: row.module,
      action: row.action,
      description: row.description,
      isActive: row.is_active === 1
    });
  }

  return roles.map((role) => ({
    ...role,
    is_system: role.is_system === 1,
    permissions: permissionMap.get(role.id) || []
  }));
}

async function createRole({ companyId, payload }) {
  const name = normalizeRequiredName(payload.name);

  try {
    const [result] = await db.execute(
      `
        INSERT INTO roles (
          company_id,
          name,
          description,
          is_system,
          status,
          created_at
        ) VALUES (
          :companyId,
          :name,
          :description,
          0,
          :status,
          CURRENT_TIMESTAMP
        )
      `,
      {
        companyId,
        name,
        description: normalizeOptional(payload.description),
        status: payload.status || 'ACTIVE'
      }
    );

    return getRoleById({ companyId, id: result.insertId });
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      const duplicate = new Error('Role name already exists in this company.');
      duplicate.statusCode = 409;
      throw duplicate;
    }

    throw error;
  }
}

async function updateRole({ companyId, id, payload }) {
  const current = await getRoleById({ companyId, id });
  if (!current) return null;

  const nextName = payload.name === undefined ? null : normalizeRequiredName(payload.name);

  if (current.is_system === 1 && nextName && nextName !== current.name) {
    const error = new Error('System roles cannot be renamed.');
    error.statusCode = 400;
    throw error;
  }

  try {
    await db.execute(
      `
        UPDATE roles
        SET
          name = COALESCE(:name, name),
          description = COALESCE(:description, description),
          status = COALESCE(:status, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE company_id = :companyId
          AND id = :id
      `,
      {
        companyId,
        id,
        name: nextName,
        description: normalizeOptional(payload.description),
        status: normalizeOptional(payload.status)
      }
    );

    return getRoleById({ companyId, id });
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      const duplicate = new Error('Role name already exists in this company.');
      duplicate.statusCode = 409;
      throw duplicate;
    }

    throw error;
  }
}

async function deleteRole({ companyId, id }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const role = await getRoleById({ companyId, id, connection });
    if (!role) {
      await connection.rollback();
      return false;
    }

    if (role.is_system === 1) {
      const error = new Error('System roles cannot be deleted.');
      error.statusCode = 400;
      throw error;
    }

    await connection.execute(
      `DELETE FROM user_roles WHERE company_id = :companyId AND role_id = :id`,
      { companyId, id }
    );

    await connection.execute(
      `DELETE FROM role_permissions WHERE company_id = :companyId AND role_id = :id`,
      { companyId, id }
    );

    await connection.execute(
      `DELETE FROM roles WHERE company_id = :companyId AND id = :id`,
      { companyId, id }
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function setRolePermissions({ companyId, roleId, permissionIds }) {
  const uniquePermissionIds = Array.from(new Set(permissionIds || []));
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const role = await getRoleById({ companyId, id: roleId, connection });
    if (!role) {
      const error = new Error('Role not found.');
      error.statusCode = 404;
      throw error;
    }

    if (uniquePermissionIds.length > 0) {
      const placeholders = uniquePermissionIds.map(() => '?').join(', ');
      const [permissionRows] = await connection.execute(
        `
          SELECT id
          FROM permissions
          WHERE is_active = 1
            AND id IN (${placeholders})
        `,
        uniquePermissionIds
      );

      const permissionMap = toMapById(permissionRows);
      const invalid = uniquePermissionIds.filter((id) => !permissionMap.has(id));
      if (invalid.length > 0) {
        const error = new Error(`Invalid permission ids: ${invalid.join(', ')}`);
        error.statusCode = 400;
        throw error;
      }
    }

    await connection.execute(
      `DELETE FROM role_permissions WHERE company_id = :companyId AND role_id = :roleId`,
      { companyId, roleId }
    );

    if (uniquePermissionIds.length > 0) {
      const values = uniquePermissionIds.map((permissionId) => [companyId, roleId, permissionId]);
      await connection.query(
        `
          INSERT INTO role_permissions (company_id, role_id, permission_id)
          VALUES ?
        `,
        [values]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return getRoleById({ companyId, id: roleId });
}

async function setCompanyUserRoles({ companyId, companyUserId, roleIds }) {
  const uniqueRoleIds = Array.from(new Set(roleIds || []));
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [companyUserRows] = await connection.execute(
      `
        SELECT id, status
        FROM company_users
        WHERE company_id = :companyId
          AND id = :companyUserId
        LIMIT 1
      `,
      { companyId, companyUserId }
    );

    const companyUser = companyUserRows[0];
    if (!companyUser) {
      const error = new Error('Company user not found.');
      error.statusCode = 404;
      throw error;
    }

    if (companyUser.status === 'REMOVED') {
      const error = new Error('Cannot assign roles to a removed company user.');
      error.statusCode = 400;
      throw error;
    }

    if (uniqueRoleIds.length > 0) {
      const placeholders = uniqueRoleIds.map(() => '?').join(', ');
      const [roleRows] = await connection.execute(
        `
          SELECT id
          FROM roles
          WHERE company_id = ?
            AND status = 'ACTIVE'
            AND id IN (${placeholders})
        `,
        [companyId, ...uniqueRoleIds]
      );

      const roleMap = toMapById(roleRows);
      const invalid = uniqueRoleIds.filter((id) => !roleMap.has(id));
      if (invalid.length > 0) {
        const error = new Error(`Invalid role ids: ${invalid.join(', ')}`);
        error.statusCode = 400;
        throw error;
      }
    }

    await connection.execute(
      `
        DELETE FROM user_roles
        WHERE company_id = :companyId
          AND company_user_id = :companyUserId
      `,
      { companyId, companyUserId }
    );

    if (uniqueRoleIds.length > 0) {
      const values = uniqueRoleIds.map((roleId) => [companyId, companyUserId, roleId]);
      await connection.query(
        `
          INSERT INTO user_roles (company_id, company_user_id, role_id)
          VALUES ?
        `,
        [values]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const [rows] = await db.execute(
    `
      SELECT
        ur.role_id,
        r.name,
        r.status
      FROM user_roles ur
      INNER JOIN roles r
        ON r.company_id = ur.company_id
       AND r.id = ur.role_id
      WHERE ur.company_id = :companyId
        AND ur.company_user_id = :companyUserId
      ORDER BY r.name ASC
    `,
    { companyId, companyUserId }
  );

  return {
    companyUserId,
    roles: rows
  };
}

module.exports = {
  getRoleById,
  listPermissions,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  setRolePermissions,
  setCompanyUserRoles
};
