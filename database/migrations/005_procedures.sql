-- 005_procedures.sql
-- Procedimientos de negocio para pagos y recálculo de saldos

DELIMITER $$

CREATE PROCEDURE usp_recalculate_loan_balance (
    IN p_company_id BIGINT UNSIGNED,
    IN p_loan_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_total_amount DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_paid_amount DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_charges_amount DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_balance_amount DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_due_date DATE;
    DECLARE v_new_status VARCHAR(20);

    SELECT total_amount, due_date
    INTO v_total_amount, v_due_date
    FROM loans
    WHERE company_id = p_company_id
      AND id = p_loan_id;

    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_paid_amount
    FROM loan_payments
    WHERE company_id = p_company_id
      AND loan_id = p_loan_id
      AND status = 'VALID';

    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_charges_amount
    FROM loan_charges
    WHERE company_id = p_company_id
      AND loan_id = p_loan_id
      AND status = 'ACTIVE';

    SET v_balance_amount = v_total_amount + v_charges_amount - v_paid_amount;

    IF v_balance_amount <= 0 THEN
        SET v_balance_amount = 0.00;
        SET v_new_status = 'PAID';
    ELSEIF v_due_date < CURRENT_DATE THEN
        SET v_new_status = 'OVERDUE';
    ELSE
        SET v_new_status = 'ACTIVE';
    END IF;

    UPDATE loans
    SET
        paid_amount = v_paid_amount,
        charges_amount = v_charges_amount,
        balance_amount = v_balance_amount,
        status = v_new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE company_id = p_company_id
      AND id = p_loan_id;
END$$

CREATE PROCEDURE usp_create_loan_payment (
    IN p_company_id BIGINT UNSIGNED,
    IN p_public_id CHAR(36),
    IN p_loan_id BIGINT UNSIGNED,
    IN p_customer_id BIGINT UNSIGNED,
    IN p_collector_company_user_id BIGINT UNSIGNED,
    IN p_amount DECIMAL(18,2),
    IN p_payment_method VARCHAR(30),
    IN p_reference_number VARCHAR(100),
    IN p_notes TEXT,
    IN p_created_by_company_user_id BIGINT UNSIGNED
)
BEGIN
    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El monto del pago debe ser mayor que cero.';
    END IF;

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
        created_by_company_user_id
    )
    VALUES (
        p_company_id,
        p_public_id,
        p_loan_id,
        p_customer_id,
        p_collector_company_user_id,
        CURRENT_TIMESTAMP,
        p_amount,
        p_payment_method,
        p_reference_number,
        p_notes,
        'VALID',
        p_created_by_company_user_id
    );

    CALL usp_recalculate_loan_balance(p_company_id, p_loan_id);
END$$

DELIMITER ;
