const db = require('../../lib/db');

function toDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultDateRange(query) {
  const today = new Date();
  const to = toDateOnly(today);

  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 6);
  const from = toDateOnly(fromDate);

  return {
    from: query?.from || from,
    to: query?.to || to
  };
}

async function getPortfolioReport({ companyId }) {
  const [loanStatsRows] = await db.execute(
    `
      SELECT
        COALESCE(SUM(principal_amount), 0) AS total_principal_loaned,
        COALESCE(SUM(balance_amount), 0) AS total_outstanding,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_loans,
        SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) AS overdue_loans
      FROM loans
      WHERE company_id = :companyId
    `,
    { companyId }
  );

  const [customerStatsRows] = await db.execute(
    `
      SELECT
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_customers
      FROM customers
      WHERE company_id = :companyId
    `,
    { companyId }
  );

  const [paymentsTodayRows] = await db.execute(
    `
      SELECT
        COALESCE(SUM(amount), 0) AS total_collected_today,
        COUNT(*) AS payments_today
      FROM loan_payments
      WHERE company_id = :companyId
        AND status = 'VALID'
        AND DATE(payment_date) = CURRENT_DATE
    `,
    { companyId }
  );

  return {
    totals: {
      totalPrincipalLoaned: Number(loanStatsRows[0]?.total_principal_loaned || 0),
      totalOutstanding: Number(loanStatsRows[0]?.total_outstanding || 0),
      totalCollectedToday: Number(paymentsTodayRows[0]?.total_collected_today || 0)
    },
    counters: {
      activeLoans: Number(loanStatsRows[0]?.active_loans || 0),
      overdueLoans: Number(loanStatsRows[0]?.overdue_loans || 0),
      activeCustomers: Number(customerStatsRows[0]?.active_customers || 0),
      paymentsToday: Number(paymentsTodayRows[0]?.payments_today || 0)
    }
  };
}

async function getOverdueLoansReport({ companyId, query }) {
  const safeLimit = Number.isInteger(query?.limit) && query.limit > 0 ? query.limit : 50;

  const [rows] = await db.execute(
    `
      SELECT
        l.id,
        l.loan_number,
        l.customer_id,
        c.full_name AS customer_name,
        l.due_date,
        l.balance_amount,
        DATEDIFF(CURRENT_DATE, l.due_date) AS days_overdue
      FROM loans l
      INNER JOIN customers c
        ON c.company_id = l.company_id
       AND c.id = l.customer_id
      WHERE l.company_id = :companyId
        AND l.status = 'OVERDUE'
        AND l.balance_amount > 0
      ORDER BY days_overdue DESC, l.balance_amount DESC
      LIMIT ${safeLimit}
    `,
    { companyId }
  );

  return { items: rows };
}

async function getDailyPaymentsReport({ companyId, query }) {
  const range = defaultDateRange(query);

  const [rows] = await db.execute(
    `
      SELECT
        DATE(payment_date) AS payment_day,
        COUNT(*) AS payments_count,
        COALESCE(SUM(amount), 0) AS total_amount
      FROM loan_payments
      WHERE company_id = :companyId
        AND status = 'VALID'
        AND DATE(payment_date) BETWEEN :fromDate AND :toDate
      GROUP BY DATE(payment_date)
      ORDER BY payment_day ASC
    `,
    {
      companyId,
      fromDate: range.from,
      toDate: range.to
    }
  );

  return {
    from: range.from,
    to: range.to,
    items: rows.map((item) => ({
      day: toDateOnly(item.payment_day),
      paymentsCount: Number(item.payments_count || 0),
      totalAmount: Number(item.total_amount || 0)
    }))
  };
}

async function getCollectorPaymentsReport({ companyId, query }) {
  const range = defaultDateRange(query);

  const [rows] = await db.execute(
    `
      SELECT
        cu.id AS collector_company_user_id,
        u.full_name AS collector_name,
        COUNT(lp.id) AS payments_count,
        COALESCE(SUM(lp.amount), 0) AS total_amount
      FROM loan_payments lp
      INNER JOIN company_users cu
        ON cu.company_id = lp.company_id
       AND cu.id = lp.collector_company_user_id
      INNER JOIN users u
        ON u.id = cu.user_id
      WHERE lp.company_id = :companyId
        AND lp.status = 'VALID'
        AND DATE(lp.payment_date) BETWEEN :fromDate AND :toDate
      GROUP BY cu.id, u.full_name
      ORDER BY total_amount DESC, payments_count DESC, collector_name ASC
    `,
    {
      companyId,
      fromDate: range.from,
      toDate: range.to
    }
  );

  return {
    from: range.from,
    to: range.to,
    items: rows.map((item) => ({
      collectorCompanyUserId: Number(item.collector_company_user_id || 0),
      collectorName: item.collector_name || 'Sin nombre',
      paymentsCount: Number(item.payments_count || 0),
      totalAmount: Number(item.total_amount || 0)
    }))
  };
}

module.exports = {
  getPortfolioReport,
  getOverdueLoansReport,
  getDailyPaymentsReport,
  getCollectorPaymentsReport
};
