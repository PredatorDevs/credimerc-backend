const { randomUUID } = require('crypto');
const db = require('../../lib/db');

function roundMoney(value) {
  return Number(Number(value).toFixed(2));
}

function normalizeLoanStatusByDates({ dueDate, balanceAmount, currentStatus }) {
  if (currentStatus === 'CANCELLED') return 'CANCELLED';
  if (balanceAmount <= 0) return 'PAID';
  const dueMs = new Date(dueDate).setHours(0, 0, 0, 0);
  const nowMs = new Date().setHours(0, 0, 0, 0);
  return dueMs < nowMs ? 'OVERDUE' : 'ACTIVE';
}

async function ensureCustomerBelongsCompany({ companyId, customerId }) {
  const [rows] = await db.execute(
    `
      SELECT id, status
      FROM customers
      WHERE company_id = :companyId
        AND id = :customerId
      LIMIT 1
    `,
    { companyId, customerId }
  );

  return rows[0] || null;
}

async function getLastLoanSequence({ companyId }) {
  const [rows] = await db.execute(
    `
      SELECT MAX(CAST(SUBSTRING(loan_number, 3) AS UNSIGNED)) AS seq
      FROM loans
      WHERE company_id = :companyId
        AND loan_number REGEXP '^L-[0-9]+$'
    `,
    { companyId }
  );

  return Number(rows[0]?.seq || 0);
}

async function generateLoanNumber({ companyId }) {
  const seq = (await getLastLoanSequence({ companyId })) + 1;
  return `L-${String(seq).padStart(4, '0')}`;
}

async function getLoanById({ companyId, id }) {
  const [rows] = await db.execute(
    `
      SELECT
        l.id,
        l.public_id,
        l.company_id,
        l.loan_number,
        l.customer_id,
        c.full_name AS customer_name,
        l.principal_amount,
        l.interest_rate,
        l.interest_amount,
        l.total_amount,
        l.paid_amount,
        l.charges_amount,
        l.balance_amount,
        l.start_date,
        l.due_date,
        l.status,
        l.created_by_company_user_id,
        l.cancelled_by_company_user_id,
        l.cancelled_at,
        l.cancellation_reason,
        l.created_at,
        l.updated_at
      FROM loans l
      INNER JOIN customers c
        ON c.company_id = l.company_id
       AND c.id = l.customer_id
      WHERE l.company_id = :companyId
        AND l.id = :id
      LIMIT 1
    `,
    { companyId, id }
  );

  return rows[0] || null;
}

async function listLoans({ companyId, query }) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const filters = ['l.company_id = :companyId'];
  const params = { companyId, limit: pageSize, offset };

  if (query.status) {
    filters.push('l.status = :status');
    params.status = query.status;
  }

  if (query.customerId) {
    filters.push('l.customer_id = :customerId');
    params.customerId = query.customerId;
  }

  if (query.overdueOnly) {
    filters.push('l.balance_amount > 0');
    filters.push('l.due_date < CURRENT_DATE');
    filters.push("l.status IN ('ACTIVE', 'OVERDUE')");
  }

  const whereClause = filters.join(' AND ');

  const [items] = await db.execute(
    `
      SELECT
        l.id,
        l.public_id,
        l.loan_number,
        l.customer_id,
        c.full_name AS customer_name,
        l.principal_amount,
        l.interest_rate,
        l.interest_amount,
        l.total_amount,
        l.paid_amount,
        l.charges_amount,
        l.balance_amount,
        l.start_date,
        l.due_date,
        l.status,
        l.created_at,
        l.updated_at
      FROM loans l
      INNER JOIN customers c
        ON c.company_id = l.company_id
       AND c.id = l.customer_id
      WHERE ${whereClause}
      ORDER BY l.id DESC
      LIMIT :limit OFFSET :offset
    `,
    params
  );

  const [countRows] = await db.execute(`SELECT COUNT(*) AS total FROM loans l WHERE ${whereClause}`, params);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total: countRows[0]?.total || 0
    }
  };
}

async function createLoan({ companyId, companyUserId, payload }) {
  const customer = await ensureCustomerBelongsCompany({
    companyId,
    customerId: payload.customerId
  });

  if (!customer) {
    const error = new Error('Customer not found for active company.');
    error.statusCode = 404;
    throw error;
  }

  const principalAmount = roundMoney(payload.principalAmount);
  const interestRate = Number(payload.interestRate);
  const interestAmount = roundMoney(principalAmount * (interestRate / 100));
  const totalAmount = roundMoney(principalAmount + interestAmount);
  const balanceAmount = totalAmount;
  const loanNumber = await generateLoanNumber({ companyId });

  const [result] = await db.execute(
    `
      INSERT INTO loans (
        company_id,
        public_id,
        loan_number,
        customer_id,
        principal_amount,
        interest_rate,
        interest_amount,
        total_amount,
        paid_amount,
        charges_amount,
        balance_amount,
        start_date,
        due_date,
        status,
        created_by_company_user_id,
        created_at
      ) VALUES (
        :companyId,
        :publicId,
        :loanNumber,
        :customerId,
        :principalAmount,
        :interestRate,
        :interestAmount,
        :totalAmount,
        0,
        0,
        :balanceAmount,
        :startDate,
        :dueDate,
        :status,
        :companyUserId,
        CURRENT_TIMESTAMP
      )
    `,
    {
      companyId,
      publicId: randomUUID(),
      loanNumber,
      customerId: payload.customerId,
      principalAmount,
      interestRate,
      interestAmount,
      totalAmount,
      balanceAmount,
      startDate: payload.startDate,
      dueDate: payload.dueDate,
      status: normalizeLoanStatusByDates({ dueDate: payload.dueDate, balanceAmount, currentStatus: 'ACTIVE' }),
      companyUserId: companyUserId || null
    }
  );

  return getLoanById({ companyId, id: result.insertId });
}

async function updateLoan({ companyId, id, payload }) {
  const current = await getLoanById({ companyId, id });
  if (!current) return null;

  if (current.status === 'CANCELLED') {
    const error = new Error('Cancelled loan cannot be edited.');
    error.statusCode = 409;
    throw error;
  }

  const [statsRows] = await db.execute(
    `
      SELECT
        SUM(CASE WHEN status = 'VALID' THEN 1 ELSE 0 END) AS valid_payments,
        COALESCE(SUM(CASE WHEN status = 'VALID' THEN amount ELSE 0 END), 0) AS paid_total
      FROM loan_payments
      WHERE company_id = :companyId
        AND loan_id = :loanId
    `,
    { companyId, loanId: id }
  );

  const validPayments = Number(statsRows[0]?.valid_payments || 0);
  if (validPayments > 0 && (payload.principalAmount !== undefined || payload.interestRate !== undefined || payload.startDate !== undefined)) {
    const error = new Error('Cannot modify principal, interestRate or startDate when valid payments already exist.');
    error.statusCode = 409;
    throw error;
  }

  const principalAmount = payload.principalAmount !== undefined ? roundMoney(payload.principalAmount) : Number(current.principal_amount);
  const interestRate = payload.interestRate !== undefined ? Number(payload.interestRate) : Number(current.interest_rate);
  const interestAmount = roundMoney(principalAmount * (interestRate / 100));
  const totalAmount = roundMoney(principalAmount + interestAmount);
  const paidAmount = roundMoney(Number(current.paid_amount));
  const chargesAmount = roundMoney(Number(current.charges_amount));
  const balanceAmount = roundMoney(Math.max(0, totalAmount + chargesAmount - paidAmount));
  const startDate = payload.startDate || current.start_date;
  const dueDate = payload.dueDate || current.due_date;

  const nextStatus = payload.status || normalizeLoanStatusByDates({
    dueDate,
    balanceAmount,
    currentStatus: current.status
  });

  await db.execute(
    `
      UPDATE loans
      SET
        principal_amount = :principalAmount,
        interest_rate = :interestRate,
        interest_amount = :interestAmount,
        total_amount = :totalAmount,
        balance_amount = :balanceAmount,
        start_date = :startDate,
        due_date = :dueDate,
        status = :status,
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = :companyId
        AND id = :id
    `,
    {
      principalAmount,
      interestRate,
      interestAmount,
      totalAmount,
      balanceAmount,
      startDate,
      dueDate,
      status: nextStatus,
      companyId,
      id
    }
  );

  return getLoanById({ companyId, id });
}

async function cancelLoan({ companyId, id, companyUserId, reason }) {
  const current = await getLoanById({ companyId, id });
  if (!current) return null;

  if (current.status === 'CANCELLED') {
    return current;
  }

  const [paymentRows] = await db.execute(
    `
      SELECT COUNT(*) AS total
      FROM loan_payments
      WHERE company_id = :companyId
        AND loan_id = :loanId
        AND status = 'VALID'
    `,
    { companyId, loanId: id }
  );

  if (Number(paymentRows[0]?.total || 0) > 0) {
    const error = new Error('Loan with valid payments cannot be cancelled.');
    error.statusCode = 409;
    throw error;
  }

  await db.execute(
    `
      UPDATE loans
      SET
        status = 'CANCELLED',
        cancelled_by_company_user_id = :companyUserId,
        cancelled_at = CURRENT_TIMESTAMP,
        cancellation_reason = :reason,
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = :companyId
        AND id = :id
    `,
    {
      companyId,
      id,
      companyUserId: companyUserId || null,
      reason
    }
  );

  return getLoanById({ companyId, id });
}

async function listOverdueLoans({ companyId }) {
  const [rows] = await db.execute(
    `
      SELECT
        l.id,
        l.public_id,
        l.loan_number,
        l.customer_id,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        l.balance_amount,
        l.due_date,
        DATEDIFF(CURRENT_DATE, l.due_date) AS overdue_days,
        l.status
      FROM loans l
      INNER JOIN customers c
        ON c.company_id = l.company_id
       AND c.id = l.customer_id
      WHERE l.company_id = :companyId
        AND l.balance_amount > 0
        AND l.due_date < CURRENT_DATE
        AND l.status IN ('ACTIVE', 'OVERDUE')
      ORDER BY l.due_date ASC
    `,
    { companyId }
  );

  return rows;
}

module.exports = {
  getLoanById,
  listLoans,
  createLoan,
  updateLoan,
  cancelLoan,
  listOverdueLoans
};
