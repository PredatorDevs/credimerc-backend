-- 007_demo_seed_data.sql
-- Datos demo idempotentes para entorno local/pruebas
-- Requiere haber ejecutado 000..006

DELIMITER $$

CREATE PROCEDURE usp_seed_demo_data ()
BEGIN
    DECLARE v_user_id BIGINT UNSIGNED;
    DECLARE v_company_id BIGINT UNSIGNED;
    DECLARE v_company_user_id BIGINT UNSIGNED;
    DECLARE v_customer_1 BIGINT UNSIGNED;
    DECLARE v_customer_2 BIGINT UNSIGNED;
    DECLARE v_customer_3 BIGINT UNSIGNED;
    DECLARE v_loan_1 BIGINT UNSIGNED;
    DECLARE v_loan_2 BIGINT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO users (
        public_id,
        email,
        password_hash,
        full_name,
        phone,
        email_verified_at,
        status
    )
    SELECT
        '9db5c50b-7ca0-4f7f-b081-4c4f2f5b82c2',
        'demo.owner@credimerc.local',
        '$2b$10$demo_hash_replace_me',
        'Demo Owner',
        '+50370000001',
        CURRENT_TIMESTAMP,
        'ACTIVE'
    FROM DUAL
    WHERE NOT EXISTS (
        SELECT 1 FROM users WHERE email = 'demo.owner@credimerc.local'
    );

    SELECT id INTO v_user_id
    FROM users
    WHERE email = 'demo.owner@credimerc.local'
    LIMIT 1;

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
    )
    SELECT
        '2869579b-741d-4f47-9ce1-fecdd2ccf710',
        'Demo CrediMerc Company',
        'Demo CM',
        'Demo CrediMerc S.A. de C.V.',
        '0614-999999-101-0',
        '999999-9',
        '+50370000002',
        'contacto@democm.sv',
        'San Salvador, El Salvador',
        'ACTIVE',
        v_user_id
    FROM DUAL
    WHERE NOT EXISTS (
        SELECT 1 FROM companies WHERE name = 'Demo CrediMerc Company'
    );

    SELECT id INTO v_company_id
    FROM companies
    WHERE name = 'Demo CrediMerc Company'
    LIMIT 1;

    INSERT INTO company_users (
        company_id,
        user_id,
        employee_code,
        job_title,
        is_owner,
        status,
        joined_at
    )
    SELECT
        v_company_id,
        v_user_id,
        'OWN-001',
        'Propietario',
        1,
        'ACTIVE',
        CURRENT_TIMESTAMP
    FROM DUAL
    WHERE NOT EXISTS (
        SELECT 1
        FROM company_users
        WHERE company_id = v_company_id
          AND user_id = v_user_id
    );

    SELECT id INTO v_company_user_id
    FROM company_users
    WHERE company_id = v_company_id
      AND user_id = v_user_id
    LIMIT 1;

    CALL usp_bootstrap_company_defaults(v_company_id, v_company_user_id);

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
        business_name,
        market_name,
        market_sector,
        status,
        created_by_company_user_id
    )
    SELECT
        v_company_id,
        '7a2cdf24-c699-4a73-b5d8-957f4af2ded2',
        'C-001',
        'Maria',
        'Lopez',
        'Maria Lopez',
        'DUI',
        '01234567-8',
        '+50371110001',
        'Puesto de Verduras Lopez',
        'Mercado Central',
        'Verduras',
        'ACTIVE',
        v_company_user_id
    FROM DUAL
    WHERE NOT EXISTS (
        SELECT 1 FROM customers WHERE company_id = v_company_id AND code = 'C-001'
    );

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
        business_name,
        market_name,
        market_sector,
        status,
        created_by_company_user_id
    )
    SELECT
        v_company_id,
        'fcf6d164-feec-4b13-b05c-26811bc44613',
        'C-002',
        'Jose',
        'Martinez',
        'Jose Martinez',
        'DUI',
        '22334455-6',
        '+50371110002',
        'Abarroteria Martinez',
        'Mercado Tinetti',
        'Abarrotes',
        'ACTIVE',
        v_company_user_id
    FROM DUAL
    WHERE NOT EXISTS (
        SELECT 1 FROM customers WHERE company_id = v_company_id AND code = 'C-002'
    );

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
        business_name,
        market_name,
        market_sector,
        status,
        created_by_company_user_id
    )
    SELECT
        v_company_id,
        'f6ecce3f-8a26-41d5-853d-0ddb353f9be1',
        'C-003',
        'Ana',
        'Rivas',
        'Ana Rivas',
        'DUI',
        '33445566-7',
        '+50371110003',
        'Textiles Ana',
        'Mercado Ex-Cuartel',
        'Textiles',
        'ACTIVE',
        v_company_user_id
    FROM DUAL
    WHERE NOT EXISTS (
        SELECT 1 FROM customers WHERE company_id = v_company_id AND code = 'C-003'
    );

    SELECT id INTO v_customer_1 FROM customers WHERE company_id = v_company_id AND code = 'C-001' LIMIT 1;
    SELECT id INTO v_customer_2 FROM customers WHERE company_id = v_company_id AND code = 'C-002' LIMIT 1;
    SELECT id INTO v_customer_3 FROM customers WHERE company_id = v_company_id AND code = 'C-003' LIMIT 1;

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
        created_by_company_user_id
    )
    SELECT
        v_company_id,
        '0c8bb262-42dd-4ec7-a84e-3f5d84fc04c6',
        'L-0001',
        v_customer_1,
        100.00,
        20.0000,
        20.00,
        120.00,
        0.00,
        0.00,
        120.00,
        CURRENT_DATE,
        DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY),
        'ACTIVE',
        v_company_user_id
    FROM DUAL
    WHERE NOT EXISTS (
        SELECT 1 FROM loans WHERE company_id = v_company_id AND loan_number = 'L-0001'
    );

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
        created_by_company_user_id
    )
    SELECT
        v_company_id,
        'f24bb55a-5e4f-490c-b1ce-4d2b3dac6b0e',
        'L-0002',
        v_customer_2,
        250.00,
        15.0000,
        37.50,
        287.50,
        0.00,
        0.00,
        287.50,
        CURRENT_DATE,
        DATE_ADD(CURRENT_DATE, INTERVAL 45 DAY),
        'ACTIVE',
        v_company_user_id
    FROM DUAL
    WHERE NOT EXISTS (
        SELECT 1 FROM loans WHERE company_id = v_company_id AND loan_number = 'L-0002'
    );

    COMMIT;
END$$

DELIMITER ;

-- Ejecutar para insertar datos demo
-- CALL usp_seed_demo_data();
