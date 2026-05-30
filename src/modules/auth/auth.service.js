const { randomUUID, randomBytes, createHash } = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../../lib/db');
const env = require('../../config/env');

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken() {
  return randomBytes(48).toString('hex');
}

function mapMembershipRow(row) {
  if (!row) {
    return {
      companyId: null,
      companyUserId: null,
      companyUserStatus: 'INACTIVE',
      permissions: []
    };
  }

  return {
    companyId: row.company_id,
    companyUserId: row.company_user_id,
    companyUserStatus: row.company_user_status,
    permissions: []
  };
}

async function getMembershipWithPermissions({ userId, preferredCompanyId }) {
  const [membershipRows] = await db.execute(
    `
      SELECT
        cu.company_id,
        cu.id AS company_user_id,
        cu.status AS company_user_status,
        c.status AS company_status
      FROM company_users cu
      INNER JOIN companies c
        ON c.id = cu.company_id
      WHERE cu.user_id = :userId
        AND cu.status IN ('ACTIVE', 'INVITED')
        AND c.status = 'ACTIVE'
      ORDER BY
        CASE WHEN cu.company_id = :preferredCompanyId THEN 0 ELSE 1 END,
        cu.is_owner DESC,
        cu.id ASC
      LIMIT 1
    `,
    {
      userId,
      preferredCompanyId: preferredCompanyId || 0
    }
  );

  const membership = mapMembershipRow(membershipRows[0]);

  if (!membership.companyUserId) {
    return membership;
  }

  const [permissionRows] = await db.execute(
    `
      SELECT DISTINCT p.code
      FROM user_roles ur
      INNER JOIN role_permissions rp
        ON rp.company_id = ur.company_id
       AND rp.role_id = ur.role_id
      INNER JOIN permissions p
        ON p.id = rp.permission_id
      WHERE ur.company_id = :companyId
        AND ur.company_user_id = :companyUserId
        AND p.is_active = 1
      ORDER BY p.code ASC
    `,
    {
      companyId: membership.companyId,
      companyUserId: membership.companyUserId
    }
  );

  membership.permissions = permissionRows.map((item) => item.code);
  return membership;
}

function signAccessToken({ user, membership }) {
  return jwt.sign(
    {
      user_id: user.id,
      company_user_id: membership.companyUserId,
      active_company_id: membership.companyId,
      user_status: user.status,
      company_user_status: membership.companyUserStatus,
      permissions: membership.permissions
    },
    env.jwtAccessSecret,
    {
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
      expiresIn: `${env.jwt.accessExpiresInMinutes}m`
    }
  );
}

async function createSession({ userId, ipAddress, userAgent }) {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  await db.execute(
    `
      INSERT INTO user_sessions (
        user_id,
        refresh_token_hash,
        ip_address,
        user_agent,
        expires_at,
        revoked_at,
        created_at
      ) VALUES (
        :userId,
        :refreshTokenHash,
        :ipAddress,
        :userAgent,
        DATE_ADD(CURRENT_TIMESTAMP, INTERVAL :refreshDays DAY),
        NULL,
        CURRENT_TIMESTAMP
      )
    `,
    {
      userId,
      refreshTokenHash,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      refreshDays: env.jwt.refreshExpiresInDays
    }
  );

  return refreshToken;
}

async function rotateSession({ sessionId, ipAddress, userAgent }) {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  await db.execute(
    `
      UPDATE user_sessions
      SET
        refresh_token_hash = :refreshTokenHash,
        ip_address = COALESCE(:ipAddress, ip_address),
        user_agent = COALESCE(:userAgent, user_agent),
        expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL :refreshDays DAY),
        revoked_at = NULL
      WHERE id = :sessionId
    `,
    {
      refreshTokenHash,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      refreshDays: env.jwt.refreshExpiresInDays,
      sessionId
    }
  );

  return refreshToken;
}

async function register({ payload }) {
  const [existingRows] = await db.execute(
    `SELECT id FROM users WHERE email = :email LIMIT 1`,
    { email: payload.email.toLowerCase() }
  );

  if (existingRows[0]) {
    const error = new Error('Email already registered.');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(payload.password, env.security.bcryptSaltRounds);
  const publicId = randomUUID();

  const [result] = await db.execute(
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
      publicId,
      email: payload.email.toLowerCase(),
      passwordHash,
      fullName: payload.fullName,
      phone: payload.phone || null
    }
  );

  return {
    id: result.insertId,
    publicId,
    email: payload.email.toLowerCase(),
    fullName: payload.fullName,
    phone: payload.phone || null
  };
}

async function login({ payload, ipAddress, userAgent }) {
  const [userRows] = await db.execute(
    `
      SELECT id, public_id, email, password_hash, full_name, phone, status
      FROM users
      WHERE email = :email
      LIMIT 1
    `,
    { email: payload.email.toLowerCase() }
  );

  const user = userRows[0];
  if (!user) {
    const error = new Error('Invalid credentials.');
    error.statusCode = 401;
    throw error;
  }

  const passwordOk = await bcrypt.compare(payload.password, user.password_hash);
  if (!passwordOk) {
    const error = new Error('Invalid credentials.');
    error.statusCode = 401;
    throw error;
  }

  if (user.status !== 'ACTIVE') {
    const error = new Error('User account is not active.');
    error.statusCode = 403;
    throw error;
  }

  const membership = await getMembershipWithPermissions({ userId: user.id });
  const accessToken = signAccessToken({ user, membership });
  const refreshToken = await createSession({ userId: user.id, ipAddress, userAgent });

  await db.execute(
    `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = :userId`,
    { userId: user.id }
  );

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresInSeconds: env.jwt.accessExpiresInMinutes * 60,
    user: {
      id: user.id,
      publicId: user.public_id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      status: user.status
    },
    activeCompanyId: membership.companyId,
    companyUserId: membership.companyUserId,
    permissions: membership.permissions
  };
}

async function refresh({ refreshToken, ipAddress, userAgent }) {
  const tokenHash = hashToken(refreshToken);

  const [sessionRows] = await db.execute(
    `
      SELECT
        us.id,
        us.user_id,
        us.expires_at,
        us.revoked_at,
        u.id AS user_id_full,
        u.public_id,
        u.email,
        u.full_name,
        u.phone,
        u.status
      FROM user_sessions us
      INNER JOIN users u
        ON u.id = us.user_id
      WHERE us.refresh_token_hash = :tokenHash
      LIMIT 1
    `,
    { tokenHash }
  );

  const session = sessionRows[0];
  if (!session) {
    const error = new Error('Invalid refresh token.');
    error.statusCode = 401;
    throw error;
  }

  if (session.revoked_at) {
    const error = new Error('Refresh token revoked.');
    error.statusCode = 401;
    throw error;
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    const error = new Error('Refresh token expired.');
    error.statusCode = 401;
    throw error;
  }

  if (session.status && session.status !== 'ACTIVE') {
    const error = new Error('User account is not active.');
    error.statusCode = 403;
    throw error;
  }

  const user = {
    id: session.user_id,
    public_id: session.public_id,
    email: session.email,
    full_name: session.full_name,
    phone: session.phone,
    status: session.status
  };

  const membership = await getMembershipWithPermissions({ userId: user.id });
  const accessToken = signAccessToken({ user, membership });
  const newRefreshToken = await rotateSession({ sessionId: session.id, ipAddress, userAgent });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    tokenType: 'Bearer',
    expiresInSeconds: env.jwt.accessExpiresInMinutes * 60,
    activeCompanyId: membership.companyId,
    companyUserId: membership.companyUserId,
    permissions: membership.permissions
  };
}

async function logout({ refreshToken }) {
  const tokenHash = hashToken(refreshToken);

  const [result] = await db.execute(
    `
      UPDATE user_sessions
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE refresh_token_hash = :tokenHash
        AND revoked_at IS NULL
    `,
    { tokenHash }
  );

  return result.affectedRows > 0;
}

async function selectCompany({ userId, companyId }) {
  const [userRows] = await db.execute(
    `SELECT id, public_id, email, full_name, phone, status FROM users WHERE id = :userId LIMIT 1`,
    { userId }
  );

  const user = userRows[0];
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const membership = await getMembershipWithPermissions({ userId, preferredCompanyId: companyId });

  if (membership.companyId !== companyId) {
    const error = new Error('User does not belong to selected company.');
    error.statusCode = 403;
    throw error;
  }

  const accessToken = signAccessToken({ user, membership });
  return {
    accessToken,
    tokenType: 'Bearer',
    expiresInSeconds: env.jwt.accessExpiresInMinutes * 60,
    activeCompanyId: membership.companyId,
    companyUserId: membership.companyUserId,
    permissions: membership.permissions
  };
}

async function getAuthProfile({ userId }) {
  const [userRows] = await db.execute(
    `SELECT id, public_id, email, full_name, phone, status, last_login_at FROM users WHERE id = :userId LIMIT 1`,
    { userId }
  );

  const user = userRows[0];
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const membership = await getMembershipWithPermissions({ userId });

  return {
    user: {
      id: user.id,
      publicId: user.public_id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      status: user.status,
      lastLoginAt: user.last_login_at
    },
    activeCompanyId: membership.companyId,
    companyUserId: membership.companyUserId,
    permissions: membership.permissions
  };
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  selectCompany,
  getAuthProfile
};
