-- 006_company_bootstrap.sql
-- Inicializacion de datos por empresa (roles, permisos, settings y owner)

DELIMITER $$

CREATE PROCEDURE usp_bootstrap_company_defaults (
    IN p_company_id BIGINT UNSIGNED,
    IN p_owner_company_user_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_owner_role_id BIGINT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1) Crear roles base del tenant (si no existen)
    INSERT INTO roles (company_id, name, description, is_system, status)
    SELECT p_company_id, t.name, t.description, 1, 'ACTIVE'
    FROM (
        SELECT 'Propietario' AS name, 'Acceso total a la empresa' AS description
        UNION ALL SELECT 'Administrador', 'Gestion operativa completa de la empresa'
        UNION ALL SELECT 'Supervisor', 'Supervision de cartera y cobranza'
        UNION ALL SELECT 'Cobrador', 'Registro de visitas y pagos en campo'
        UNION ALL SELECT 'Solo Lectura', 'Acceso de consulta sin modificaciones'
    ) t
    LEFT JOIN roles r
        ON r.company_id = p_company_id
       AND r.name = t.name
    WHERE r.id IS NULL;

    -- 2) Configuraciones base por empresa (si no existen)
    INSERT INTO company_settings (company_id, setting_key, setting_value, data_type)
    SELECT p_company_id, s.setting_key, s.setting_value, s.data_type
    FROM (
        SELECT 'loan.default_interest_rate' AS setting_key, '20.00' AS setting_value, 'NUMBER' AS data_type
        UNION ALL SELECT 'loan.allow_partial_payments', 'true', 'BOOLEAN'
        UNION ALL SELECT 'loan.allow_manual_late_fee', 'true', 'BOOLEAN'
        UNION ALL SELECT 'loan.default_term_days', '30', 'NUMBER'
        UNION ALL SELECT 'collections.require_visit_notes', 'false', 'BOOLEAN'
    ) s
    LEFT JOIN company_settings cs
        ON cs.company_id = p_company_id
       AND cs.setting_key = s.setting_key
    WHERE cs.id IS NULL;

    -- 3) Asignar permisos al rol Propietario (todos los permisos activos)
    INSERT IGNORE INTO role_permissions (company_id, role_id, permission_id)
    SELECT r.company_id, r.id, p.id
    FROM roles r
    INNER JOIN permissions p
        ON p.is_active = 1
    WHERE r.company_id = p_company_id
      AND r.name = 'Propietario';

    -- 4) Asignar permisos al rol Administrador (todos menos roles.manage)
    INSERT IGNORE INTO role_permissions (company_id, role_id, permission_id)
    SELECT r.company_id, r.id, p.id
    FROM roles r
    INNER JOIN permissions p
        ON p.is_active = 1
    WHERE r.company_id = p_company_id
      AND r.name = 'Administrador'
      AND p.code <> 'roles.manage';

    -- 5) Asignar permisos al rol Supervisor
    INSERT IGNORE INTO role_permissions (company_id, role_id, permission_id)
    SELECT r.company_id, r.id, p.id
    FROM roles r
    INNER JOIN permissions p
        ON p.is_active = 1
    WHERE r.company_id = p_company_id
      AND r.name = 'Supervisor'
      AND p.code IN (
          'dashboard.view',
          'customers.view', 'customers.create', 'customers.update',
          'loans.view', 'loans.create', 'loans.update',
          'payments.view', 'payments.create',
          'charges.create',
          'collections.view', 'collections.create',
          'reports.view'
      );

    -- 6) Asignar permisos al rol Cobrador
    INSERT IGNORE INTO role_permissions (company_id, role_id, permission_id)
    SELECT r.company_id, r.id, p.id
    FROM roles r
    INNER JOIN permissions p
        ON p.is_active = 1
    WHERE r.company_id = p_company_id
      AND r.name = 'Cobrador'
      AND p.code IN (
          'dashboard.view',
          'customers.view',
          'loans.view',
          'payments.view', 'payments.create',
          'collections.view', 'collections.create'
      );

    -- 7) Asignar permisos al rol Solo Lectura
    INSERT IGNORE INTO role_permissions (company_id, role_id, permission_id)
    SELECT r.company_id, r.id, p.id
    FROM roles r
    INNER JOIN permissions p
        ON p.is_active = 1
    WHERE r.company_id = p_company_id
      AND r.name = 'Solo Lectura'
      AND p.code IN (
          'dashboard.view',
          'users.view',
          'customers.view',
          'loans.view',
          'payments.view',
          'collections.view',
          'reports.view'
      );

    -- 8) Asignar rol Propietario al owner de la empresa
    SELECT id
    INTO v_owner_role_id
    FROM roles
    WHERE company_id = p_company_id
      AND name = 'Propietario'
    LIMIT 1;

    IF v_owner_role_id IS NOT NULL THEN
        INSERT IGNORE INTO user_roles (company_id, company_user_id, role_id)
        VALUES (p_company_id, p_owner_company_user_id, v_owner_role_id);
    END IF;

    COMMIT;
END$$

DELIMITER ;
