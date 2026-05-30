-- 003_seed_permissions_base.sql
-- Permisos base del MVP (sin modulo de archivos)

INSERT INTO permissions (code, module, action, description) VALUES
('dashboard.view', 'dashboard', 'view', 'Ver dashboard'),
('users.view', 'users', 'view', 'Ver usuarios'),
('users.create', 'users', 'create', 'Crear usuarios'),
('users.update', 'users', 'update', 'Editar usuarios'),
('roles.manage', 'roles', 'manage', 'Administrar roles y permisos'),
('customers.view', 'customers', 'view', 'Ver clientes'),
('customers.create', 'customers', 'create', 'Crear clientes'),
('customers.update', 'customers', 'update', 'Editar clientes'),
('loans.view', 'loans', 'view', 'Ver prestamos'),
('loans.create', 'loans', 'create', 'Crear prestamos'),
('loans.update', 'loans', 'update', 'Editar prestamos'),
('loans.cancel', 'loans', 'cancel', 'Cancelar prestamos'),
('payments.view', 'payments', 'view', 'Ver pagos'),
('payments.create', 'payments', 'create', 'Registrar pagos'),
('payments.void', 'payments', 'void', 'Anular pagos'),
('charges.create', 'charges', 'create', 'Agregar cargos o mora'),
('collections.view', 'collections', 'view', 'Ver cobranzas'),
('collections.create', 'collections', 'create', 'Registrar visitas de cobro'),
('reports.view', 'reports', 'view', 'Ver reportes'),
('settings.manage', 'settings', 'manage', 'Administrar configuracion de empresa')
ON DUPLICATE KEY UPDATE
    module = VALUES(module),
    action = VALUES(action),
    description = VALUES(description),
    is_active = 1;
