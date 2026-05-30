const { randomUUID } = require('crypto');
const db = require('../../lib/db');

function buildFullName(firstName, lastName) {
  return [firstName || '', lastName || ''].join(' ').trim();
}

function normalizeOptional(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  const trimmed = typeof value === 'string' ? value.trim() : value;
  return trimmed === '' ? null : trimmed;
}

async function createCustomer({ companyId, companyUserId, payload }) {
  const firstName = normalizeOptional(payload.firstName);
  const lastName = normalizeOptional(payload.lastName) || null;
  const fullName = buildFullName(firstName, lastName);

  const [result] = await db.execute(
    `
      INSERT INTO customers (
        company_id,
        public_id,
        code,
        first_name,
        last_name,
        full_name,
        document_type,
        document_number,
        phone,
        secondary_phone,
        email,
        business_name,
        business_type,
        market_name,
        market_sector,
        stall_number,
        address,
        notes,
        status,
        created_by_company_user_id,
        created_at
      ) VALUES (
        :companyId,
        :publicId,
        :code,
        :firstName,
        :lastName,
        :fullName,
        :documentType,
        :documentNumber,
        :phone,
        :secondaryPhone,
        :email,
        :businessName,
        :businessType,
        :marketName,
        :marketSector,
        :stallNumber,
        :address,
        :notes,
        :status,
        :companyUserId,
        CURRENT_TIMESTAMP
      )
    `,
    {
      companyId,
      publicId: randomUUID(),
      code: normalizeOptional(payload.code),
      firstName,
      lastName,
      fullName,
      documentType: normalizeOptional(payload.documentType),
      documentNumber: normalizeOptional(payload.documentNumber),
      phone: normalizeOptional(payload.phone),
      secondaryPhone: normalizeOptional(payload.secondaryPhone),
      email: normalizeOptional(payload.email),
      businessName: normalizeOptional(payload.businessName),
      businessType: normalizeOptional(payload.businessType),
      marketName: normalizeOptional(payload.marketName),
      marketSector: normalizeOptional(payload.marketSector),
      stallNumber: normalizeOptional(payload.stallNumber),
      address: normalizeOptional(payload.address),
      notes: normalizeOptional(payload.notes),
      status: payload.status || 'ACTIVE',
      companyUserId: companyUserId || null
    }
  );

  return getCustomerById({ companyId, id: result.insertId });
}

async function getCustomerById({ companyId, id }) {
  const [rows] = await db.execute(
    `
      SELECT
        id,
        public_id,
        company_id,
        code,
        first_name,
        last_name,
        full_name,
        document_type,
        document_number,
        phone,
        secondary_phone,
        email,
        business_name,
        business_type,
        market_name,
        market_sector,
        stall_number,
        address,
        notes,
        status,
        created_by_company_user_id,
        created_at,
        updated_at
      FROM customers
      WHERE company_id = :companyId
        AND id = :id
      LIMIT 1
    `,
    { companyId, id }
  );

  return rows[0] || null;
}

async function listCustomers({ companyId, query }) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const offset = (page - 1) * pageSize;
  const safeLimit = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 20;
  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;

  const filters = ['company_id = ?'];
  const filterParams = [companyId];

  if (query.status) {
    filters.push('status = ?');
    filterParams.push(query.status);
  }

  if (query.q) {
    filters.push('(full_name LIKE ? OR phone LIKE ? OR document_number LIKE ? OR code LIKE ?)');
    const search = `%${query.q}%`;
    filterParams.push(search, search, search, search);
  }

  const whereClause = filters.join(' AND ');

  const [items] = await db.execute(
    `
      SELECT
        id,
        public_id,
        company_id,
        code,
        first_name,
        last_name,
        full_name,
        document_type,
        document_number,
        phone,
        secondary_phone,
        email,
        business_name,
        market_name,
        market_sector,
        status,
        created_at,
        updated_at
      FROM customers
      WHERE ${whereClause}
      ORDER BY id DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `,
    filterParams
  );

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total FROM customers WHERE ${whereClause}`,
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

async function updateCustomer({ companyId, id, payload }) {
  const current = await getCustomerById({ companyId, id });
  if (!current) return null;

  const nextFirstName = payload.firstName !== undefined ? normalizeOptional(payload.firstName) : current.first_name;
  const nextLastName = payload.lastName !== undefined ? normalizeOptional(payload.lastName) : current.last_name;

  const nextFullName = buildFullName(nextFirstName, nextLastName);

  await db.execute(
    `
      UPDATE customers
      SET
        code = COALESCE(:code, code),
        first_name = :firstName,
        last_name = :lastName,
        full_name = :fullName,
        document_type = COALESCE(:documentType, document_type),
        document_number = COALESCE(:documentNumber, document_number),
        phone = COALESCE(:phone, phone),
        secondary_phone = COALESCE(:secondaryPhone, secondary_phone),
        email = COALESCE(:email, email),
        business_name = COALESCE(:businessName, business_name),
        business_type = COALESCE(:businessType, business_type),
        market_name = COALESCE(:marketName, market_name),
        market_sector = COALESCE(:marketSector, market_sector),
        stall_number = COALESCE(:stallNumber, stall_number),
        address = COALESCE(:address, address),
        notes = COALESCE(:notes, notes),
        status = COALESCE(:status, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = :companyId
        AND id = :id
    `,
    {
      companyId,
      id,
      code: normalizeOptional(payload.code),
      firstName: nextFirstName,
      lastName: nextLastName,
      fullName: nextFullName,
      documentType: normalizeOptional(payload.documentType),
      documentNumber: normalizeOptional(payload.documentNumber),
      phone: normalizeOptional(payload.phone),
      secondaryPhone: normalizeOptional(payload.secondaryPhone),
      email: normalizeOptional(payload.email),
      businessName: normalizeOptional(payload.businessName),
      businessType: normalizeOptional(payload.businessType),
      marketName: normalizeOptional(payload.marketName),
      marketSector: normalizeOptional(payload.marketSector),
      stallNumber: normalizeOptional(payload.stallNumber),
      address: normalizeOptional(payload.address),
      notes: normalizeOptional(payload.notes),
      status: normalizeOptional(payload.status)
    }
  );

  return getCustomerById({ companyId, id });
}

async function deactivateCustomer({ companyId, id }) {
  const [result] = await db.execute(
    `
      UPDATE customers
      SET
        status = 'INACTIVE',
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = :companyId
        AND id = :id
    `,
    { companyId, id }
  );

  return result.affectedRows > 0;
}

module.exports = {
  createCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer,
  deactivateCustomer
};
