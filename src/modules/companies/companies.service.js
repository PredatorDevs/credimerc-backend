const { randomUUID } = require('crypto');
const db = require('../../lib/db');

async function createCompanyWithBootstrap({ userId, payload }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const companyPublicId = randomUUID();
    const insertCompanySql = `
      INSERT INTO companies (
        public_id,
        name,
        commercial_name,
        legal_name,
        nit,
        nrc,
        phone,
        email,
        address,
        status,
        created_by_user_id
      ) VALUES (
        :publicId,
        :name,
        :commercialName,
        :legalName,
        :nit,
        :nrc,
        :phone,
        :email,
        :address,
        'ACTIVE',
        :createdByUserId
      )
    `;

    const [companyResult] = await connection.execute(insertCompanySql, {
      publicId: companyPublicId,
      name: payload.name,
      commercialName: payload.commercialName || null,
      legalName: payload.legalName || null,
      nit: payload.nit || null,
      nrc: payload.nrc || null,
      phone: payload.phone || null,
      email: payload.email || null,
      address: payload.address || null,
      createdByUserId: userId
    });

    const companyId = companyResult.insertId;

    const insertCompanyUserSql = `
      INSERT INTO company_users (
        company_id,
        user_id,
        is_owner,
        status,
        joined_at
      ) VALUES (
        :companyId,
        :userId,
        1,
        'ACTIVE',
        CURRENT_TIMESTAMP
      )
    `;

    const [companyUserResult] = await connection.execute(insertCompanyUserSql, {
      companyId,
      userId
    });

    const ownerCompanyUserId = companyUserResult.insertId;

    await connection.query('CALL usp_bootstrap_company_defaults(?, ?)', [companyId, ownerCompanyUserId]);

    const [rows] = await connection.execute(
      `
        SELECT
          c.id,
          c.public_id,
          c.name,
          c.commercial_name,
          c.legal_name,
          c.nit,
          c.nrc,
          c.phone,
          c.email,
          c.address,
          c.status,
          c.created_at,
          c.updated_at
        FROM companies c
        WHERE c.id = :companyId
        LIMIT 1
      `,
      { companyId }
    );

    await connection.commit();

    return {
      ...rows[0],
      owner_company_user_id: ownerCompanyUserId
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listUserCompanies({ userId }) {
  const [rows] = await db.execute(
    `
      SELECT
        c.id,
        c.public_id,
        c.name,
        c.commercial_name,
        c.status,
        cu.id AS company_user_id,
        cu.is_owner,
        cu.status AS company_user_status,
        cu.joined_at
      FROM company_users cu
      INNER JOIN companies c
        ON c.id = cu.company_id
      WHERE cu.user_id = :userId
      ORDER BY c.id DESC
    `,
    { userId }
  );

  return rows;
}

module.exports = {
  createCompanyWithBootstrap,
  listUserCompanies
};
