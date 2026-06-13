const db = require('../../lib/db');
const bcrypt = require('bcryptjs');
const { randomUUID, randomBytes } = require('crypto');
const env = require('../../config/env');

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const trimmed = typeof value === 'string' ? value.trim() : value;
  return trimmed === '' ? null : trimmed;
}

async function findUserByEmail({ email }) {
  const [rows] = await db.execute(
    `
      SELECT id, public_id, email, full_name, status
      FROM users
      WHERE email = :email
      LIMIT 1
    `,
    { email: email.toLowerCase() }
  );

  return rows[0] || null;
}

async function getCompanyUserById({ companyId, id }) {
  const [rows] = await db.execute(
    `
      SELECT
        cu.id,
        cu.company_id,
        cu.user_id,
        cu.employee_code,
        cu.job_title,
        cu.is_owner,
        cu.status,
        cu.joined_at,
        cu.invited_at,
        cu.created_at,
        cu.updated_at,
        u.public_id AS user_public_id,
        u.email AS user_email,
        u.full_name AS user_full_name,
        u.status AS user_status
      FROM company_users cu
      INNER JOIN users u
        ON u.id = cu.user_id
      WHERE cu.company_id = :companyId
        AND cu.id = :id
      LIMIT 1
    `,
    { companyId, id }
  );

  return rows[0] || null;
}

async function listCompanyUsers({ companyId, query }) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const offset = (page - 1) * pageSize;
  const safeLimit = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 20;
  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;

  const filters = ['cu.company_id = ?'];
  const filterParams = [companyId];

  if (query.status) {
    filters.push('cu.status = ?');
    filterParams.push(query.status);
  }

  if (query.q) {
    const search = `%${query.q}%`;
    filters.push('(u.full_name LIKE ? OR u.email LIKE ? OR cu.employee_code LIKE ? OR cu.job_title LIKE ?)');
    filterParams.push(search, search, search, search);
  }

  const whereClause = filters.join(' AND ');

  const [items] = await db.execute(
    `
      SELECT
        cu.id,
        cu.company_id,
        cu.user_id,
        cu.employee_code,
        cu.job_title,
        cu.is_owner,
        cu.status,
        cu.joined_at,
        cu.invited_at,
        cu.created_at,
        cu.updated_at,
        u.public_id AS user_public_id,
        u.email AS user_email,
        u.full_name AS user_full_name,
        u.status AS user_status
      FROM company_users cu
      INNER JOIN users u
        ON u.id = cu.user_id
      WHERE ${whereClause}
      ORDER BY cu.id DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `,
    filterParams
  );

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total FROM company_users cu INNER JOIN users u ON u.id = cu.user_id WHERE ${whereClause}`,
    filterParams
  );

  return {
    items,
    pagination: {
      page,
      pageSize,
      total: countRows[0]?.total || 0
    }
  };
}

async function inviteCompanyUser({ companyId, payload }) {
  let user = await findUserByEmail({ email: payload.email });

  if (!user) {
    const generatedPassword = randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(generatedPassword, env.security.bcryptSaltRounds);
    const email = payload.email.toLowerCase();
    const fullName = normalizeOptional(payload.fullName) || inferFullNameFromEmail(email);
    const phone = normalizeOptional(payload.phone);

    const [userInsertResult] = await db.execute(
      `
        INSERT INTO users (
          public_id,
          email,
          password_hash,
          full_name,
          phone,
          status,
          created_at
        ) VALUES (
          :publicId,
          :email,
          :passwordHash,
          :fullName,
          :phone,
          'ACTIVE',
          CURRENT_TIMESTAMP
        )
      `,
      {
        publicId: randomUUID(),
        email,
        passwordHash,
        fullName,
        phone
      }
    );

    user = {
      id: userInsertResult.insertId,
      email,
      full_name: fullName,
      status: 'ACTIVE'
    };
  }

  const [existingRows] = await db.execute(
    `
      SELECT id, status
      FROM company_users
      WHERE company_id = :companyId
        AND user_id = :userId
      LIMIT 1
    `,
    {
      companyId,
      userId: user.id
    }
  );

  const status = payload.status || 'INVITED';
  const employeeCode = normalizeOptional(payload.employeeCode);
  const jobTitle = normalizeOptional(payload.jobTitle);
  const isOwner = payload.isOwner ? 1 : 0;

  if (existingRows[0]) {
    const existing = existingRows[0];

    if (existing.status === 'ACTIVE' || existing.status === 'INVITED') {
      const error = new Error('User already belongs to this company.');
      error.statusCode = 409;
      throw error;
    }

    await db.execute(
      `
        UPDATE company_users
        SET
          employee_code = :employeeCode,
          job_title = :jobTitle,
          is_owner = :isOwner,
          status = :status,
          invited_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE company_id = :companyId
          AND id = :id
      `,
      {
        companyId,
        id: existing.id,
        employeeCode,
        jobTitle,
        isOwner,
        status
      }
    );

    return getCompanyUserById({ companyId, id: existing.id });
  }

  const [insertResult] = await db.execute(
    `
      INSERT INTO company_users (
        company_id,
        user_id,
        employee_code,
        job_title,
        is_owner,
        status,
        joined_at,
        invited_at,
        created_at
      ) VALUES (
        :companyId,
        :userId,
        :employeeCode,
        :jobTitle,
        :isOwner,
        :status,
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `,
    {
      companyId,
      userId: user.id,
      employeeCode,
      jobTitle,
      isOwner,
      status
    }
  );

  return getCompanyUserById({ companyId, id: insertResult.insertId });
}

function inferFullNameFromEmail(email) {
  const local = (email || '').split('@')[0] || 'Usuario';
  const normalized = local.replace(/[._-]+/g, ' ').trim();

  if (!normalized) {
    return 'Usuario Invitado';
  }

  return normalized
    .split(/\s+/)
    .map((part) => part[0].toUpperCase() + part.substring(1))
    .join(' ');
}

async function updateCompanyUser({ companyId, id, payload, actorCompanyUserId }) {
  const current = await getCompanyUserById({ companyId, id });
  if (!current) return null;

  if (actorCompanyUserId && Number(actorCompanyUserId) === Number(id) && payload.status === 'REMOVED') {
    const error = new Error('You cannot remove your own membership.');
    error.statusCode = 400;
    throw error;
  }

  await db.execute(
    `
      UPDATE company_users
      SET
        employee_code = COALESCE(:employeeCode, employee_code),
        job_title = COALESCE(:jobTitle, job_title),
        is_owner = COALESCE(:isOwner, is_owner),
        status = COALESCE(:status, status),
        joined_at = CASE
          WHEN :status = 'ACTIVE' AND joined_at IS NULL THEN CURRENT_TIMESTAMP
          ELSE joined_at
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = :companyId
        AND id = :id
    `,
    {
      companyId,
      id,
      employeeCode: normalizeOptional(payload.employeeCode),
      jobTitle: normalizeOptional(payload.jobTitle),
      isOwner: payload.isOwner === undefined ? null : (payload.isOwner ? 1 : 0),
      status: normalizeOptional(payload.status)
    }
  );

  return getCompanyUserById({ companyId, id });
}

async function removeCompanyUser({ companyId, id, actorCompanyUserId }) {
  if (actorCompanyUserId && Number(actorCompanyUserId) === Number(id)) {
    const error = new Error('You cannot remove your own membership.');
    error.statusCode = 400;
    throw error;
  }

  const [result] = await db.execute(
    `
      UPDATE company_users
      SET
        status = 'REMOVED',
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = :companyId
        AND id = :id
    `,
    { companyId, id }
  );

  return result.affectedRows > 0;
}

module.exports = {
  getCompanyUserById,
  listCompanyUsers,
  inviteCompanyUser,
  updateCompanyUser,
  removeCompanyUser
};
