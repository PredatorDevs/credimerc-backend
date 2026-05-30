-- 004_views.sql
-- Vistas base para validacion de saldos y prestamos vencidos

CREATE OR REPLACE VIEW vw_loan_balances AS
SELECT
    l.company_id,
    l.id AS loan_id,
    l.loan_number,
    l.customer_id,
    l.principal_amount,
    l.interest_amount,
    l.total_amount,
    COALESCE(ch.total_charges, 0.00) AS calculated_charges_amount,
    COALESCE(p.total_payments, 0.00) AS calculated_paid_amount,
    (l.total_amount + COALESCE(ch.total_charges, 0.00) - COALESCE(p.total_payments, 0.00)) AS calculated_balance_amount,
    l.balance_amount AS stored_balance_amount,
    l.status,
    l.start_date,
    l.due_date
FROM loans l
LEFT JOIN (
    SELECT
        company_id,
        loan_id,
        SUM(amount) AS total_payments
    FROM loan_payments
    WHERE status = 'VALID'
    GROUP BY company_id, loan_id
) p
    ON p.company_id = l.company_id
    AND p.loan_id = l.id
LEFT JOIN (
    SELECT
        company_id,
        loan_id,
        SUM(amount) AS total_charges
    FROM loan_charges
    WHERE status = 'ACTIVE'
    GROUP BY company_id, loan_id
) ch
    ON ch.company_id = l.company_id
    AND ch.loan_id = l.id;

CREATE OR REPLACE VIEW vw_overdue_loans AS
SELECT
    l.company_id,
    l.id AS loan_id,
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
WHERE l.balance_amount > 0
  AND l.due_date < CURRENT_DATE
  AND l.status IN ('ACTIVE', 'OVERDUE');
