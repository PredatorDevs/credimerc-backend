-- 000_core_schema.sql
-- Esquema base del MVP CrediMerc (MySQL 8+)

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(30) NULL,
    email_verified_at DATETIME NULL,
    last_login_at DATETIME NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_public_id (public_id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS companies (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    commercial_name VARCHAR(200) NULL,
    legal_name VARCHAR(200) NULL,
    nit VARCHAR(30) NULL,
    nrc VARCHAR(30) NULL,
    phone VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
    address VARCHAR(500) NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_companies_public_id (public_id),
    KEY idx_companies_status (status),
    KEY idx_companies_created_by_user_id (created_by_user_id),

    CONSTRAINT fk_companies_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    employee_code VARCHAR(50) NULL,
    job_title VARCHAR(100) NULL,
    is_owner TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('ACTIVE', 'INACTIVE', 'INVITED', 'REMOVED') NOT NULL DEFAULT 'ACTIVE',
    joined_at DATETIME NULL,
    invited_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_company_users_company_user (company_id, user_id),
    UNIQUE KEY uq_company_users_company_id_id (company_id, id),
    KEY idx_company_users_user_id (user_id),
    KEY idx_company_users_status (status),

    CONSTRAINT fk_company_users_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id),

    CONSTRAINT fk_company_users_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_permissions_code (code),
    KEY idx_permissions_module (module),
    KEY idx_permissions_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    is_system TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_company_name (company_id, name),
    UNIQUE KEY uq_roles_company_id_id (company_id, id),
    KEY idx_roles_status (status),

    CONSTRAINT fk_roles_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_role_permissions_role_permission (role_id, permission_id),
    KEY idx_role_permissions_company_id (company_id),
    KEY idx_role_permissions_permission_id (permission_id),

    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (company_id, role_id)
        REFERENCES roles(company_id, id),

    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id)
        REFERENCES permissions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    company_user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_user_roles_company_user_role (company_user_id, role_id),
    KEY idx_user_roles_company_id (company_id),
    KEY idx_user_roles_role_id (role_id),

    CONSTRAINT fk_user_roles_company_user
        FOREIGN KEY (company_id, company_user_id)
        REFERENCES company_users(company_id, id),

    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (company_id, role_id)
        REFERENCES roles(company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_settings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NULL,
    data_type ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON') NOT NULL DEFAULT 'STRING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_company_settings_key (company_id, setting_key),

    CONSTRAINT fk_company_settings_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    public_id CHAR(36) NOT NULL,
    code VARCHAR(50) NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NULL,
    full_name VARCHAR(200) NOT NULL,
    document_type ENUM('DUI', 'NIT', 'PASSPORT', 'OTHER') NULL,
    document_number VARCHAR(50) NULL,
    phone VARCHAR(30) NULL,
    secondary_phone VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
    business_name VARCHAR(200) NULL,
    business_type VARCHAR(100) NULL,
    market_name VARCHAR(150) NULL,
    market_sector VARCHAR(100) NULL,
    stall_number VARCHAR(50) NULL,
    address VARCHAR(500) NULL,
    notes TEXT NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    created_by_company_user_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_customers_public_id (public_id),
    UNIQUE KEY uq_customers_company_id_id (company_id, id),
    UNIQUE KEY uq_customers_company_code (company_id, code),
    KEY idx_customers_company_full_name (company_id, full_name),
    KEY idx_customers_company_phone (company_id, phone),
    KEY idx_customers_company_document (company_id, document_number),
    KEY idx_customers_company_status (company_id, status),

    CONSTRAINT fk_customers_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id),

    CONSTRAINT fk_customers_created_by_company_user
        FOREIGN KEY (company_id, created_by_company_user_id)
        REFERENCES company_users(company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_references (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    relationship VARCHAR(100) NULL,
    phone VARCHAR(30) NULL,
    address VARCHAR(500) NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_customer_references_customer (company_id, customer_id),

    CONSTRAINT fk_customer_references_customer
        FOREIGN KEY (company_id, customer_id)
        REFERENCES customers(company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loans (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    public_id CHAR(36) NOT NULL,
    loan_number VARCHAR(50) NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,

    principal_amount DECIMAL(18,2) NOT NULL,
    interest_rate DECIMAL(9,4) NOT NULL DEFAULT 0.0000,
    interest_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,

    paid_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    charges_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    balance_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,

    start_date DATE NOT NULL,
    due_date DATE NOT NULL,

    status ENUM('ACTIVE', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',

    created_by_company_user_id BIGINT UNSIGNED NULL,
    cancelled_by_company_user_id BIGINT UNSIGNED NULL,
    cancelled_at DATETIME NULL,
    cancellation_reason VARCHAR(500) NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_loans_public_id (public_id),
    UNIQUE KEY uq_loans_company_loan_number (company_id, loan_number),
    UNIQUE KEY uq_loans_company_id_id (company_id, id),
    KEY idx_loans_company_customer (company_id, customer_id),
    KEY idx_loans_company_status (company_id, status),
    KEY idx_loans_company_due_date (company_id, due_date),
    KEY idx_loans_company_balance (company_id, balance_amount),

    CONSTRAINT fk_loans_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id),

    CONSTRAINT fk_loans_customer
        FOREIGN KEY (company_id, customer_id)
        REFERENCES customers(company_id, id),

    CONSTRAINT fk_loans_created_by_company_user
        FOREIGN KEY (company_id, created_by_company_user_id)
        REFERENCES company_users(company_id, id),

    CONSTRAINT fk_loans_cancelled_by_company_user
        FOREIGN KEY (company_id, cancelled_by_company_user_id)
        REFERENCES company_users(company_id, id),

    CONSTRAINT chk_loans_principal_amount CHECK (principal_amount > 0),
    CONSTRAINT chk_loans_interest_rate CHECK (interest_rate >= 0),
    CONSTRAINT chk_loans_amounts CHECK (
        interest_amount >= 0
        AND total_amount >= 0
        AND paid_amount >= 0
        AND charges_amount >= 0
        AND balance_amount >= 0
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loan_payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    public_id CHAR(36) NOT NULL,
    loan_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    collector_company_user_id BIGINT UNSIGNED NULL,

    payment_date DATETIME NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    payment_method ENUM('CASH', 'BANK_TRANSFER', 'CARD', 'MOBILE_WALLET', 'OTHER') NOT NULL DEFAULT 'CASH',
    reference_number VARCHAR(100) NULL,
    notes TEXT NULL,

    status ENUM('VALID', 'VOIDED') NOT NULL DEFAULT 'VALID',
    voided_by_company_user_id BIGINT UNSIGNED NULL,
    voided_at DATETIME NULL,
    void_reason VARCHAR(500) NULL,

    created_by_company_user_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_loan_payments_public_id (public_id),
    UNIQUE KEY uq_loan_payments_company_id_id (company_id, id),
    KEY idx_loan_payments_company_loan (company_id, loan_id),
    KEY idx_loan_payments_company_customer (company_id, customer_id),
    KEY idx_loan_payments_company_date (company_id, payment_date),
    KEY idx_loan_payments_company_status (company_id, status),

    CONSTRAINT fk_loan_payments_loan
        FOREIGN KEY (company_id, loan_id)
        REFERENCES loans(company_id, id),

    CONSTRAINT fk_loan_payments_customer
        FOREIGN KEY (company_id, customer_id)
        REFERENCES customers(company_id, id),

    CONSTRAINT fk_loan_payments_collector
        FOREIGN KEY (company_id, collector_company_user_id)
        REFERENCES company_users(company_id, id),

    CONSTRAINT fk_loan_payments_created_by_company_user
        FOREIGN KEY (company_id, created_by_company_user_id)
        REFERENCES company_users(company_id, id),

    CONSTRAINT fk_loan_payments_voided_by_company_user
        FOREIGN KEY (company_id, voided_by_company_user_id)
        REFERENCES company_users(company_id, id),

    CONSTRAINT chk_loan_payments_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loan_charges (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    public_id CHAR(36) NOT NULL,
    loan_id BIGINT UNSIGNED NOT NULL,
    charge_type ENUM('LATE_FEE', 'ADJUSTMENT', 'OTHER') NOT NULL DEFAULT 'LATE_FEE',
    amount DECIMAL(18,2) NOT NULL,
    reason VARCHAR(500) NULL,
    status ENUM('ACTIVE', 'VOIDED') NOT NULL DEFAULT 'ACTIVE',

    created_by_company_user_id BIGINT UNSIGNED NULL,
    voided_by_company_user_id BIGINT UNSIGNED NULL,
    voided_at DATETIME NULL,
    void_reason VARCHAR(500) NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_loan_charges_public_id (public_id),
    UNIQUE KEY uq_loan_charges_company_id_id (company_id, id),
    KEY idx_loan_charges_company_loan (company_id, loan_id),
    KEY idx_loan_charges_company_status (company_id, status),

    CONSTRAINT fk_loan_charges_loan
        FOREIGN KEY (company_id, loan_id)
        REFERENCES loans(company_id, id),

    CONSTRAINT fk_loan_charges_created_by_company_user
        FOREIGN KEY (company_id, created_by_company_user_id)
        REFERENCES company_users(company_id, id),

    CONSTRAINT fk_loan_charges_voided_by_company_user
        FOREIGN KEY (company_id, voided_by_company_user_id)
        REFERENCES company_users(company_id, id),

    CONSTRAINT chk_loan_charges_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collection_routes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(500) NULL,
    department VARCHAR(100) NULL,
    municipality VARCHAR(100) NULL,
    market_name VARCHAR(150) NULL,
    assigned_collector_company_user_id BIGINT UNSIGNED NULL,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_collection_routes_company_id_id (company_id, id),
    KEY idx_collection_routes_company_name (company_id, name),
    KEY idx_collection_routes_company_status (company_id, status),

    CONSTRAINT fk_collection_routes_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id),

    CONSTRAINT fk_collection_routes_assigned_collector
        FOREIGN KEY (company_id, assigned_collector_company_user_id)
        REFERENCES company_users(company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collection_route_customers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    route_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    notes VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_route_customer (company_id, route_id, customer_id),
    KEY idx_collection_route_customers_customer (company_id, customer_id),

    CONSTRAINT fk_collection_route_customers_route
        FOREIGN KEY (company_id, route_id)
        REFERENCES collection_routes(company_id, id),

    CONSTRAINT fk_collection_route_customers_customer
        FOREIGN KEY (company_id, customer_id)
        REFERENCES customers(company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collection_visits (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    loan_id BIGINT UNSIGNED NULL,
    collector_company_user_id BIGINT UNSIGNED NULL,
    payment_id BIGINT UNSIGNED NULL,

    visit_date DATETIME NOT NULL,
    result ENUM(
        'PAID',
        'PARTIAL_PAYMENT',
        'NOT_FOUND',
        'PROMISE_TO_PAY',
        'REFUSED',
        'BUSINESS_CLOSED',
        'RESCHEDULED',
        'OTHER'
    ) NOT NULL,
    amount_collected DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    promise_to_pay_date DATE NULL,
    notes TEXT NULL,
    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_collection_visits_company_id_id (company_id, id),
    KEY idx_collection_visits_company_customer (company_id, customer_id),
    KEY idx_collection_visits_company_loan (company_id, loan_id),
    KEY idx_collection_visits_company_collector_date (company_id, collector_company_user_id, visit_date),
    KEY idx_collection_visits_company_result (company_id, result),

    CONSTRAINT fk_collection_visits_customer
        FOREIGN KEY (company_id, customer_id)
        REFERENCES customers(company_id, id),

    CONSTRAINT fk_collection_visits_loan
        FOREIGN KEY (company_id, loan_id)
        REFERENCES loans(company_id, id),

    CONSTRAINT fk_collection_visits_collector
        FOREIGN KEY (company_id, collector_company_user_id)
        REFERENCES company_users(company_id, id),

    CONSTRAINT fk_collection_visits_payment
        FOREIGN KEY (company_id, payment_id)
        REFERENCES loan_payments(company_id, id),

    CONSTRAINT chk_collection_visits_amount CHECK (amount_collected >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_user_sessions_user_id (user_id),
    KEY idx_user_sessions_expires_at (expires_at),

    CONSTRAINT fk_user_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_password_reset_tokens_user_id (user_id),
    KEY idx_password_reset_tokens_expires_at (expires_at),

    CONSTRAINT fk_password_reset_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(150) NOT NULL,
    ip_address VARCHAR(45) NULL,
    success TINYINT(1) NOT NULL DEFAULT 0,
    failure_reason VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_login_attempts_email_created_at (email, created_at),
    KEY idx_login_attempts_ip_created_at (ip_address, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NULL,
    company_user_id BIGINT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT UNSIGNED NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_audit_logs_company_created_at (company_id, created_at),
    KEY idx_audit_logs_user_created_at (user_id, created_at),
    KEY idx_audit_logs_entity (entity_type, entity_id),
    KEY idx_audit_logs_action (action),

    CONSTRAINT fk_audit_logs_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id),

    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_audit_logs_company_user
        FOREIGN KEY (company_id, company_user_id)
        REFERENCES company_users(company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
