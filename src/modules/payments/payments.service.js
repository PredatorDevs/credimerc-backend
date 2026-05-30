const { randomUUID } = require('crypto');
const db = require('../../lib/db');

function roundMoney(value) {
  return Number(Number(value).toFixed(2));
}

function normalizeOptional(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = typeof value === 'string' ? value.trim() : value;
  return trimmed === '' ? null : trimmed;
}

function toMysqlDatetime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function resolveLoanStatus({ dueDate, balanceAmount, currentStatus }) {
  if (currentStatus === 'CANCELLED') return 'CANCELLED';
  if (balanceAmount <= 0) return 'PAID';

  const dueMs = new Date(dueDate).setHours(0, 0, 0, 0);
  const nowMs = new Date().setHours(0, 0, 0, 0);
  return dueMs < nowMs ? 'OVERDUE' : 'ACTIVE';
}

async function getLoanForPayment(connection, { companyId, loanId }) {
  const [rows] = await connection.execute(
    `
      SELECT
        id,
        company_id,
        customer_id,
        total_amount,
        paid_amount,
        charges_amount,
        balance_amount,
        due_date,
        status
      FROM loans
      WHERE company_id = :companyId
        AND id = :loanId
      LIMIT 1
    `,
    { companyId, loanId }
  );

  return rows[0] || null;
}

async function recalculateLoan(connection, { companyId, loanId }) {
  const [loanRows] = await connection.execute(
    `
      SELECT id, total_amount, due_date, status
      FROM loans
      WHERE company_id = :companyId
        AND id = :loanId
      LIMIT 1
    `,
    { companyId, loanId }
  );

  const loan = loanRows[0];
  if (!loan) {
    return null;
  }

  const [paymentRows] = await connection.execute(
    `
      SELECT COALESCE(SUM(amount), 0) AS total_paid
      FROM loan_payments
      WHERE company_id = :companyId
        AND loan_id = :loanId
        AND status = 'VALID'
    `,
    { companyId, loanId }
  );

  const [chargeRows] = await connection.execute(
    `
      SELECT COALESCE(SUM(amount), 0) AS total_charges
      FROM loan_charges
      WHERE company_id = :companyId
        AND loan_id = :loanId
        AND status = 'ACTIVE'
    `,
    { companyId, loanId }
  );

  const paidAmount = roundMoney(paymentRows[0]?.total_paid || 0);
  const chargesAmount = roundMoney(chargeRows[0]?.total_charges || 0);
  const balanceAmount = roundMoney(Math.max(0, Number(loan.total_amount) + chargesAmount - paidAmount));
  const nextStatus = resolveLoanStatus({
    dueDate: loan.due_date,
    balanceAmount,
    currentStatus: loan.status
  });

  await connection.execute(
    `
      UPDATE loans
      SET
        paid_amount = :paidAmount,
        charges_amount = :chargesAmount,
        balance_amount = :balanceAmount,
        status = :status,
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = :companyId
        AND id = :loanId
    `,
    {
      companyId,
      loanId,
      paidAmount,
      chargesAmount,
      balanceAmount,
      status: nextStatus
    }
  );

  return {
    paidAmount,
    chargesAmount,
    balanceAmount,
    status: nextStatus
  };
}

async function listLoanPayments({ companyId, loanId }) {
  const [rows] = await db.execute(
    `
      SELECT
        lp.id,
        lp.public_id,
        lp.company_id,
        lp.loan_id,
        lp.customer_id,
        lp.collector_company_user_id,
        lp.payment_date,
        lp.amount,
        lp.payment_method,
        lp.reference_number,
        lp.notes,
        lp.status,
        lp.voided_by_company_user_id,
        lp.voided_at,
        lp.void_reason,
        lp.created_by_company_user_id,
        lp.created_at,
        lp.updated_at
      FROM loan_payments lp
      WHERE lp.company_id = :companyId
        AND lp.loan_id = :loanId
      ORDER BY lp.payment_date DESC, lp.id DESC
    `,
    { companyId, loanId }
  );

  return rows;
}

async function createLoanPayment({ companyId, loanId, companyUserId, payload }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const loan = await getLoanForPayment(connection, { companyId, loanId });
    if (!loan) {
      const error = new Error('Loan not found.');
      error.statusCode = 404;
      throw error;
    }

    if (loan.status === 'CANCELLED') {
      const error = new Error('Cannot register payment on cancelled loan.');
      error.statusCode = 409;
      throw error;
    }

    if (!['ACTIVE', 'OVERDUE'].includes(loan.status)) {
      const error = new Error('Payments are only allowed for ACTIVE or OVERDUE loans.');
      error.statusCode = 409;
      throw error;
    }

    const amount = roundMoney(payload.amount);
    const currentBalance = roundMoney(loan.balance_amount);
    const paymentDate = toMysqlDatetime(payload.paymentDate);

    if (!paymentDate) {
      const error = new Error('Invalid paymentDate value.');
      error.statusCode = 400;
      throw error;
    }

    if (amount > currentBalance) {
      const error = new Error('Payment amount cannot exceed current balance.');
      error.statusCode = 409;
      throw error;
    }

    await connection.execute(
      `
        INSERT INTO loan_payments (
          company_id,
          public_id,
          loan_id,
          customer_id,
          collector_company_user_id,
          payment_date,
          amount,
          payment_method,
          reference_number,
          notes,
          status,
          created_by_company_user_id,
          created_at
        ) VALUES (
          :companyId,
          :publicId,
          :loanId,
          :customerId,
          :collectorCompanyUserId,
          :paymentDate,
          :amount,
          :paymentMethod,
          :referenceNumber,
          :notes,
          'VALID',
          :createdByCompanyUserId,
          CURRENT_TIMESTAMP
        )
      `,
      {
        companyId,
        publicId: randomUUID(),
        loanId,
        customerId: loan.customer_id,
        collectorCompanyUserId: payload.collectorCompanyUserId || null,
        paymentDate,
        amount,
        paymentMethod: payload.paymentMethod || 'CASH',
        referenceNumber: normalizeOptional(payload.referenceNumber),
        notes: normalizeOptional(payload.notes),
        createdByCompanyUserId: companyUserId || null
      }
    );

    await recalculateLoan(connection, { companyId, loanId });

    const [rows] = await connection.execute(
      `
        SELECT *
        FROM loan_payments
        WHERE company_id = :companyId
          AND loan_id = :loanId
        ORDER BY id DESC
        LIMIT 1
      `,
      { companyId, loanId }
    );

    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function voidLoanPayment({ companyId, paymentId, companyUserId, reason }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [paymentRows] = await connection.execute(
      `
        SELECT *
        FROM loan_payments
        WHERE company_id = :companyId
          AND id = :paymentId
        LIMIT 1
      `,
      { companyId, paymentId }
    );

    const payment = paymentRows[0];
    if (!payment) {
      const error = new Error('Payment not found.');
      error.statusCode = 404;
      throw error;
    }

    if (payment.status === 'VOIDED') {
      await connection.commit();
      return payment;
    }

    await connection.execute(
      `
        UPDATE loan_payments
        SET
          status = 'VOIDED',
          voided_by_company_user_id = :companyUserId,
          voided_at = CURRENT_TIMESTAMP,
          void_reason = :reason,
          updated_at = CURRENT_TIMESTAMP
        WHERE company_id = :companyId
          AND id = :paymentId
      `,
      {
        companyId,
        paymentId,
        companyUserId: companyUserId || null,
        reason
      }
    );

    await recalculateLoan(connection, {
      companyId,
      loanId: payment.loan_id
    });

    const [updatedRows] = await connection.execute(
      `
        SELECT *
        FROM loan_payments
        WHERE company_id = :companyId
          AND id = :paymentId
        LIMIT 1
      `,
      { companyId, paymentId }
    );

    await connection.commit();
    return updatedRows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  listLoanPayments,
  createLoanPayment,
  voidLoanPayment
};
