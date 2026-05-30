# Propuesta Técnica y Estructura de Base de Datos  
## Plataforma Multi-Tenant para Administración de Empresas Gestoras de Cobros en Mercados Municipales

**Proyecto:** Sistema MVP para gestión de prestamistas, clientes, créditos y cobranzas  
**Motor de base de datos:** MySQL 8.0 o superior  
**Enfoque:** Aplicación SaaS multi-tenant  
**Contexto:** Presentación de cátedra universitaria / MVP funcional  
**Versión del documento:** 1.0  

---

# 1. Resumen Ejecutivo

El proyecto consiste en una plataforma web orientada a la administración de empresas gestoras de cobros, prestamistas o entidades pequeñas que otorgan créditos a comerciantes formales e informales en mercados municipales de El Salvador.

El sistema permitirá que cada prestamista cree su propia empresa dentro de la plataforma y administre de forma aislada sus clientes, empleados, roles, permisos, créditos otorgados, pagos recibidos, rutas de cobro y alertas de vencimiento.

La solución se plantea como una aplicación **multi-tenant**, donde una entidad principal llamada `companies` representará a cada empresa o prestamista registrado. Toda la información operativa estará relacionada a una empresa específica mediante el campo `company_id`.

El modelo considera que un mismo usuario puede pertenecer a varias empresas bajo diferentes roles. Por ejemplo, una persona puede ser cobrador en una empresa y propietario de otra. Por esa razón, la identidad del usuario se maneja de forma global en `users`, mientras que la relación entre usuario y empresa se administra mediante `company_users`.

---

# 2. Objetivo General

Diseñar e implementar un MVP de una plataforma multi-tenant para la gestión de empresas de cobro, clientes, créditos simples, pagos arbitrarios, cobradores y alertas de vencimiento, utilizando MySQL 8.0 o superior como motor de base de datos.

---

# 3. Objetivos Específicos

- Permitir el registro de usuarios mediante correo electrónico.
- Permitir que un usuario cree una o varias empresas.
- Permitir que una empresa administre sus propios usuarios, roles y permisos.
- Permitir el registro de clientes asociados a una empresa.
- Permitir el registro de préstamos con interés simple.
- Permitir pagos parciales arbitrarios durante la vigencia del préstamo.
- Permitir alertar préstamos vencidos cuando exista saldo pendiente después de la fecha límite.
- Permitir agregar mora manual como cargo adicional.
- Permitir registrar visitas de cobro y asignaciones de cobradores.
- Garantizar aislamiento lógico de datos entre empresas mediante `company_id`.
- Mantener trazabilidad básica mediante auditoría de eventos.

---

# 4. Alcance del MVP

El sistema MVP estará enfocado en demostrar el flujo principal de negocio:

1. Registro e inicio de sesión de usuario.
2. Creación de empresa.
3. Gestión de usuarios internos de la empresa.
4. Gestión de roles y permisos.
5. Registro de clientes.
6. Registro de préstamos simples.
7. Registro de pagos parciales o totales.
8. Alerta de préstamos vencidos.
9. Registro manual de mora.
10. Registro de cobradores y visitas de cobro.
11. Consulta de saldos, clientes, préstamos activos y vencidos.

---

# 5. Exclusiones del MVP

Para mantener el alcance controlado, el MVP no incluirá:

- Amortización francesa.
- Cálculo de interés sobre saldo insoluto.
- Calendarización obligatoria de cuotas.
- Refinanciamiento automático.
- Reestructuración automática de créditos.
- Cargos automáticos de mora.
- Conciliación bancaria.
- Facturación electrónica.
- Firma digital de contratos.
- Aplicación móvil nativa.
- Sincronización offline.
- Integración con pasarelas de pago.
- Contabilidad formal.
- Liquidación avanzada de caja.
- Reportería BI avanzada.

Estas funcionalidades podrían considerarse en una fase posterior.

---

# 6. Regla Financiera Principal del MVP

El MVP manejará préstamos con **interés simple calculado una sola vez sobre el monto prestado**.

La fórmula conceptual será:

```text
Interés = Monto prestado × Porcentaje de interés
Total a pagar = Monto prestado + Interés + Cargos adicionales - Pagos realizados
```

Ejemplo:

```text
Monto prestado: $100.00
Interés pactado: 20%
Interés calculado: $20.00
Total inicial a pagar: $120.00
Plazo: 30 días
```

El cliente podrá abonar cualquier monto durante el plazo del préstamo.  
Si al llegar la fecha de vencimiento el préstamo aún tiene saldo pendiente, se marcará con alerta o estado de vencido.

La mora no será calculada automáticamente. El prestamista decidirá manualmente si agrega o no un cargo adicional por mora.

---

# 7. Reglas de Negocio del MVP

## 7.1. Reglas de Usuarios y Empresas

- Un usuario se registra una sola vez mediante correo electrónico.
- El correo electrónico debe ser único en todo el sistema.
- Un usuario puede pertenecer a una o varias empresas.
- Un usuario puede ser dueño de una empresa y empleado de otra.
- La pertenencia de un usuario a una empresa se controla mediante `company_users`.
- Los roles se definen por empresa.
- Los permisos del sistema pueden ser globales, pero su asignación se realiza por rol dentro de cada empresa.

## 7.2. Reglas de Clientes

- Cada cliente pertenece a una sola empresa.
- Dos empresas pueden registrar al mismo cliente de forma independiente.
- El mismo número de DUI o teléfono puede existir en empresas distintas.
- Dentro de una misma empresa puede validarse unicidad de código interno de cliente.

## 7.3. Reglas de Préstamos

- Cada préstamo pertenece a una empresa y a un cliente.
- El interés se calcula una sola vez al crear el préstamo.
- El total inicial del préstamo será: `principal_amount + interest_amount`.
- El sistema permitirá pagos arbitrarios.
- No existirá una tabla obligatoria de cuotas en el MVP.
- El saldo pendiente se calculará con base en pagos válidos y cargos adicionales.
- Si el saldo llega a cero, el préstamo se marca como pagado.
- Si la fecha actual supera la fecha de vencimiento y el saldo es mayor a cero, el préstamo puede marcarse como vencido.

## 7.4. Reglas de Pagos

- Un pago siempre pertenece a una empresa y a un préstamo.
- Los pagos pueden ser parciales o totales.
- Un pago no debería exceder el saldo pendiente actual, salvo que se defina una política posterior.
- Un pago puede ser anulado.
- Los pagos anulados no afectan el saldo.

## 7.5. Reglas de Mora

- La mora será un cargo manual.
- La mora se registrará en `loan_charges`.
- La mora aumenta el saldo pendiente del préstamo.
- Un préstamo puede tener múltiples cargos adicionales.
- Los cargos deben quedar auditados.

## 7.6. Reglas de Cobranza

- Los cobradores serán usuarios de empresa con rol de cobrador.
- Un cobrador puede registrar visitas.
- Una visita puede o no estar asociada a un pago.
- Se podrá registrar el resultado de la visita: pagó, no encontrado, promesa de pago, negocio cerrado, etc.

---

# 8. Arquitectura General Recomendada

## 8.1. Tipo de Aplicación

Aplicación web multi-tenant, bajo arquitectura cliente-servidor.

```text
Frontend Web
    ↓
Backend API REST
    ↓
Base de Datos MySQL 8+
```

## 8.2. Stack Técnico Sugerido

| Capa | Tecnología sugerida |
|---|---|
| Frontend | React |
| UI | Ant Design, Tailwind CSS o similar |
| Backend | Node.js con Express.js |
| Base de datos | MySQL 8.0+ |
| Autenticación | JWT + Refresh Tokens |
| Hash de contraseña | Argon2 o bcrypt |
| Almacenamiento de archivos | S3 o compatible, opcional para fases futuras |
| Auditoría | Tabla `audit_logs` |
| Control de acceso | RBAC por empresa |

---

# 9. Estrategia Multi-Tenant

## 9.1. Modelo elegido para el MVP

Se recomienda usar:

```text
Una sola base de datos
Un solo esquema
Tablas compartidas
Separación lógica mediante company_id
```

Este enfoque es adecuado para un MVP porque:

- Es más simple de implementar.
- Reduce costos.
- Facilita consultas y reportes.
- Evita tener que crear una base de datos por cliente.
- Permite escalar progresivamente.

## 9.2. Regla Principal

Toda tabla operativa debe contener `company_id`.

Ejemplos:

```text
customers.company_id
loans.company_id
loan_payments.company_id
loan_charges.company_id
collection_visits.company_id
roles.company_id
company_users.company_id
```

## 9.3. Protección contra cruces de información

No basta con agregar `company_id`. También se recomienda usar llaves foráneas compuestas en relaciones críticas.

Ejemplo conceptual:

```sql
FOREIGN KEY (company_id, customer_id)
REFERENCES customers(company_id, id)
```

Esto evita que un préstamo de la empresa A apunte por error a un cliente de la empresa B.

---

# 10. Convenciones de Base de Datos

## 10.1. Nombres

Se recomienda usar `snake_case` para tablas y columnas:

```text
company_users
created_at
customer_id
principal_amount
```

## 10.2. Campos comunes

La mayoría de tablas deberían incluir:

```text
id
company_id, si aplica
created_at
updated_at
```

En tablas sensibles también:

```text
created_by_company_user_id
updated_by_company_user_id
status
```

## 10.3. Identificadores públicos

Se recomienda usar un identificador público tipo UUID o CHAR(36) para exponer en APIs:

```text
public_id CHAR(36)
```

El campo `id` interno puede seguir siendo `BIGINT AUTO_INCREMENT`.

## 10.4. Montos

Para montos monetarios:

```sql
DECIMAL(18,2)
```

Para porcentajes:

```sql
DECIMAL(9,4)
```

---

# 11. Módulos del Sistema

## 11.1. Módulo de Seguridad

Incluye:

- Registro de usuarios.
- Login.
- Verificación de correo.
- Hash de contraseñas.
- Sesiones.
- Recuperación de contraseña.
- Bloqueo por intentos fallidos.
- Preparación para MFA futuro.

Tablas:

```text
users
user_sessions
password_reset_tokens
login_attempts
```

## 11.2. Módulo Multi-Tenant

Incluye:

- Creación de empresas.
- Relación usuario-empresa.
- Cambio de empresa activa.
- Invitación de usuarios.

Tablas:

```text
companies
company_users
company_settings
```

## 11.3. Módulo RBAC

Incluye:

- Roles por empresa.
- Permisos globales.
- Asignación de permisos a roles.
- Asignación de roles a usuarios de empresa.

Tablas:

```text
roles
permissions
role_permissions
user_roles
```

## 11.4. Módulo de Clientes

Incluye:

- Registro de clientes.
- Información de negocio.
- Mercado, sector o puesto.
- Contacto.
- Referencias.

Tablas:

```text
customers
customer_references
```

Para el MVP, `customer_addresses` y `customer_guarantors` pueden ser opcionales.

## 11.5. Módulo de Préstamos

Incluye:

- Creación de préstamo.
- Cálculo de interés simple.
- Estado del préstamo.
- Saldo pendiente.
- Fecha de vencimiento.
- Mora manual.

Tablas:

```text
loans
loan_charges
```

## 11.6. Módulo de Pagos

Incluye:

- Registro de pagos arbitrarios.
- Anulación de pagos.
- Actualización de saldo.
- Historial de pagos.

Tabla:

```text
loan_payments
```

## 11.7. Módulo de Cobranza

Incluye:

- Cobradores.
- Rutas de cobro.
- Visitas de cobro.
- Registro de resultados.

Tablas:

```text
collection_routes
collection_route_customers
collection_visits
```

## 11.8. Módulo de Auditoría

Incluye:

- Registro de acciones críticas.
- Cambios de estado.
- Creación y modificación de datos sensibles.

Tabla:

```text
audit_logs
```

---

# 12. Modelo Entidad-Relación Conceptual

```text
users
  └── company_users
        ├── companies
        ├── user_roles
        │     └── roles
        │           └── role_permissions
        │                 └── permissions
        ├── loans.created_by_company_user_id
        ├── loan_payments.collector_company_user_id
        └── collection_visits.collector_company_user_id

companies
  ├── company_settings
  ├── roles
  ├── customers
  │     └── customer_references
  ├── loans
  │     ├── loan_payments
  │     └── loan_charges
  ├── collection_routes
  │     └── collection_route_customers
  ├── collection_visits
  └── audit_logs
```

---

# 13. Estructura de Tablas Propuesta

---

## 13.1. Tabla `users`

Almacena la identidad global del usuario.

```sql
CREATE TABLE users (
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
```

---

## 13.2. Tabla `companies`

Almacena las empresas o tenants.

```sql
CREATE TABLE companies (
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
```

---

## 13.3. Tabla `company_users`

Relaciona usuarios globales con empresas.

```sql
CREATE TABLE company_users (
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
```

---

## 13.4. Tabla `permissions`

Permisos globales disponibles en el sistema.

```sql
CREATE TABLE permissions (
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
```

Permisos iniciales sugeridos:

```sql
INSERT INTO permissions (code, module, action, description) VALUES
('dashboard.view', 'dashboard', 'view', 'Ver dashboard'),
('users.view', 'users', 'view', 'Ver usuarios'),
('users.create', 'users', 'create', 'Crear usuarios'),
('users.update', 'users', 'update', 'Editar usuarios'),
('roles.manage', 'roles', 'manage', 'Administrar roles y permisos'),
('customers.view', 'customers', 'view', 'Ver clientes'),
('customers.create', 'customers', 'create', 'Crear clientes'),
('customers.update', 'customers', 'update', 'Editar clientes'),
('loans.view', 'loans', 'view', 'Ver préstamos'),
('loans.create', 'loans', 'create', 'Crear préstamos'),
('loans.update', 'loans', 'update', 'Editar préstamos'),
('loans.cancel', 'loans', 'cancel', 'Cancelar préstamos'),
('payments.view', 'payments', 'view', 'Ver pagos'),
('payments.create', 'payments', 'create', 'Registrar pagos'),
('payments.void', 'payments', 'void', 'Anular pagos'),
('charges.create', 'charges', 'create', 'Agregar cargos o mora'),
('collections.view', 'collections', 'view', 'Ver cobranzas'),
('collections.create', 'collections', 'create', 'Registrar visitas de cobro'),
('reports.view', 'reports', 'view', 'Ver reportes'),
('settings.manage', 'settings', 'manage', 'Administrar configuración de empresa');
```

---

## 13.5. Tabla `roles`

Roles personalizados por empresa.

```sql
CREATE TABLE roles (
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
```

Roles iniciales sugeridos por empresa:

```text
Propietario
Administrador
Supervisor
Cobrador
Solo Lectura
```

---

## 13.6. Tabla `role_permissions`

Relación entre roles y permisos.

```sql
CREATE TABLE role_permissions (
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
```

---

## 13.7. Tabla `user_roles`

Asignación de roles a usuarios dentro de una empresa.

```sql
CREATE TABLE user_roles (
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
```

---

## 13.8. Tabla `company_settings`

Configuraciones específicas por empresa.

```sql
CREATE TABLE company_settings (
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
```

Configuraciones iniciales sugeridas:

```text
loan.default_interest_rate
loan.allow_partial_payments
loan.allow_manual_late_fee
loan.default_term_days
collections.require_visit_notes
```

---

## 13.9. Tabla `customers`

Clientes de cada empresa.

```sql
CREATE TABLE customers (
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
```

---

## 13.10. Tabla `customer_references`

Referencias personales o comerciales de un cliente.

```sql
CREATE TABLE customer_references (
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
```

---

## 13.11. Tabla `loans`

Tabla principal de préstamos.

```sql
CREATE TABLE loans (
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

    CONSTRAINT chk_loans_principal_amount
        CHECK (principal_amount > 0),

    CONSTRAINT chk_loans_interest_rate
        CHECK (interest_rate >= 0),

    CONSTRAINT chk_loans_amounts
        CHECK (
            interest_amount >= 0
            AND total_amount >= 0
            AND paid_amount >= 0
            AND charges_amount >= 0
            AND balance_amount >= 0
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Cálculo recomendado al crear préstamo

```text
interest_amount = principal_amount * (interest_rate / 100)
total_amount = principal_amount + interest_amount
paid_amount = 0
charges_amount = 0
balance_amount = total_amount
```

---

## 13.12. Tabla `loan_payments`

Pagos realizados a préstamos.

```sql
CREATE TABLE loan_payments (
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

    CONSTRAINT chk_loan_payments_amount
        CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 13.13. Tabla `loan_charges`

Cargos adicionales al préstamo, como mora manual.

```sql
CREATE TABLE loan_charges (
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

    CONSTRAINT chk_loan_charges_amount
        CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 13.14. Tabla `collection_routes`

Rutas de cobro.

```sql
CREATE TABLE collection_routes (
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
```

---

## 13.15. Tabla `collection_route_customers`

Relación entre rutas y clientes.

```sql
CREATE TABLE collection_route_customers (
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
```

---

## 13.16. Tabla `collection_visits`

Registro de visitas de cobro.

```sql
CREATE TABLE collection_visits (
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

    CONSTRAINT chk_collection_visits_amount
        CHECK (amount_collected >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 13.17. Tabla `user_sessions`

Sesiones de usuario.

```sql
CREATE TABLE user_sessions (
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
```

---

## 13.18. Tabla `password_reset_tokens`

Tokens de recuperación de contraseña.

```sql
CREATE TABLE password_reset_tokens (
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
```

---

## 13.19. Tabla `login_attempts`

Registro de intentos de login.

```sql
CREATE TABLE login_attempts (
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
```

---

## 13.20. Tabla `audit_logs`

Auditoría de acciones relevantes.

```sql
CREATE TABLE audit_logs (
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
```

---

# 14. Vistas Recomendadas

## 14.1. Vista de préstamos con saldo actual

Aunque el saldo se guarda en `loans`, también se puede tener una vista de validación.

```sql
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
```

---

## 14.2. Vista de préstamos vencidos

```sql
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
```

---

# 15. Stored Procedures Recomendados

Para el MVP, conviene manejar la lógica financiera en backend, pero se pueden crear procedimientos para operaciones críticas.

## 15.1. Procedimiento conceptual para recalcular saldo

```sql
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

DELIMITER ;
```

---

## 15.2. Procedimiento conceptual para registrar pago

```sql
DELIMITER $$

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
```

---

# 16. Triggers Opcionales

Para el MVP, se recomienda controlar los saldos desde el backend o mediante procedimientos almacenados.  
Sin embargo, pueden implementarse triggers para reforzar integridad.

## 16.1. Trigger después de insertar pago

```sql
DELIMITER $$

CREATE TRIGGER tr_loan_payments_after_insert
AFTER INSERT ON loan_payments
FOR EACH ROW
BEGIN
    IF NEW.status = 'VALID' THEN
        CALL usp_recalculate_loan_balance(NEW.company_id, NEW.loan_id);
    END IF;
END$$

DELIMITER ;
```

## 16.2. Trigger después de actualizar pago

```sql
DELIMITER $$

CREATE TRIGGER tr_loan_payments_after_update
AFTER UPDATE ON loan_payments
FOR EACH ROW
BEGIN
    CALL usp_recalculate_loan_balance(NEW.company_id, NEW.loan_id);
END$$

DELIMITER ;
```

## 16.3. Trigger después de insertar cargo

```sql
DELIMITER $$

CREATE TRIGGER tr_loan_charges_after_insert
AFTER INSERT ON loan_charges
FOR EACH ROW
BEGIN
    IF NEW.status = 'ACTIVE' THEN
        CALL usp_recalculate_loan_balance(NEW.company_id, NEW.loan_id);
    END IF;
END$$

DELIMITER ;
```

> Nota técnica: En un MVP puede ser más simple evitar triggers y centralizar estas operaciones en servicios de backend. Para una presentación académica, los procedimientos almacenados son suficientes para demostrar control transaccional.

---

# 17. Índices Recomendados

## 17.1. Búsquedas frecuentes de clientes

```sql
KEY idx_customers_company_full_name (company_id, full_name)
KEY idx_customers_company_phone (company_id, phone)
KEY idx_customers_company_document (company_id, document_number)
```

## 17.2. Búsquedas frecuentes de préstamos

```sql
KEY idx_loans_company_customer (company_id, customer_id)
KEY idx_loans_company_status (company_id, status)
KEY idx_loans_company_due_date (company_id, due_date)
KEY idx_loans_company_balance (company_id, balance_amount)
```

## 17.3. Búsquedas frecuentes de pagos

```sql
KEY idx_loan_payments_company_loan (company_id, loan_id)
KEY idx_loan_payments_company_date (company_id, payment_date)
KEY idx_loan_payments_company_status (company_id, status)
```

## 17.4. Búsquedas frecuentes de cobranza

```sql
KEY idx_collection_visits_company_customer (company_id, customer_id)
KEY idx_collection_visits_company_collector_date (company_id, collector_company_user_id, visit_date)
KEY idx_collection_visits_company_result (company_id, result)
```

---

# 18. Consultas Base para Reportes

## 18.1. Cartera activa por empresa

```sql
SELECT
    company_id,
    COUNT(*) AS active_loans,
    SUM(principal_amount) AS total_principal,
    SUM(interest_amount) AS total_interest,
    SUM(total_amount) AS total_to_collect,
    SUM(paid_amount) AS total_paid,
    SUM(balance_amount) AS total_balance
FROM loans
WHERE company_id = ?
  AND status IN ('ACTIVE', 'OVERDUE')
GROUP BY company_id;
```

## 18.2. Créditos vencidos

```sql
SELECT
    l.loan_number,
    c.full_name AS customer_name,
    c.phone,
    l.due_date,
    l.balance_amount,
    DATEDIFF(CURRENT_DATE, l.due_date) AS overdue_days
FROM loans l
INNER JOIN customers c
    ON c.company_id = l.company_id
    AND c.id = l.customer_id
WHERE l.company_id = ?
  AND l.balance_amount > 0
  AND l.due_date < CURRENT_DATE
ORDER BY l.due_date ASC;
```

## 18.3. Pagos del día por cobrador

```sql
SELECT
    cu.id AS collector_company_user_id,
    u.full_name AS collector_name,
    COUNT(lp.id) AS payments_count,
    SUM(lp.amount) AS total_collected
FROM loan_payments lp
INNER JOIN company_users cu
    ON cu.company_id = lp.company_id
    AND cu.id = lp.collector_company_user_id
INNER JOIN users u
    ON u.id = cu.user_id
WHERE lp.company_id = ?
  AND lp.status = 'VALID'
  AND DATE(lp.payment_date) = CURRENT_DATE
GROUP BY cu.id, u.full_name
ORDER BY total_collected DESC;
```

## 18.4. Clientes con saldo pendiente

```sql
SELECT
    c.id AS customer_id,
    c.full_name,
    c.phone,
    COUNT(l.id) AS active_loans,
    SUM(l.balance_amount) AS total_pending_balance
FROM customers c
INNER JOIN loans l
    ON l.company_id = c.company_id
    AND l.customer_id = c.id
WHERE c.company_id = ?
  AND l.status IN ('ACTIVE', 'OVERDUE')
  AND l.balance_amount > 0
GROUP BY c.id, c.full_name, c.phone
ORDER BY total_pending_balance DESC;
```

---

# 19. Flujo Principal de Negocio

## 19.1. Registro de empresa

```text
1. Usuario crea cuenta.
2. Usuario verifica correo.
3. Usuario crea empresa.
4. Sistema registra:
   - companies
   - company_users con is_owner = true
   - roles base
   - permisos del rol propietario
   - company_settings por defecto
```

## 19.2. Creación de cliente

```text
1. Usuario selecciona empresa activa.
2. Usuario registra cliente.
3. Sistema guarda customers.
4. Opcionalmente guarda referencias.
5. Sistema registra auditoría.
```

## 19.3. Creación de préstamo

```text
1. Usuario selecciona cliente.
2. Ingresa monto prestado.
3. Ingresa porcentaje de interés.
4. Ingresa fecha de inicio.
5. Ingresa fecha de vencimiento.
6. Sistema calcula:
   - interest_amount
   - total_amount
   - balance_amount
7. Sistema crea préstamo en estado ACTIVE.
```

## 19.4. Registro de pago

```text
1. Usuario selecciona préstamo.
2. Ingresa monto de pago.
3. Selecciona método de pago.
4. Sistema registra loan_payments.
5. Sistema recalcula saldo.
6. Si saldo = 0, préstamo pasa a PAID.
7. Si saldo > 0, mantiene ACTIVE u OVERDUE según fecha.
```

## 19.5. Manejo de vencimiento

```text
1. Sistema identifica préstamos con due_date menor a la fecha actual.
2. Si balance_amount > 0, se muestra alerta.
3. El usuario puede marcar o confirmar estado OVERDUE.
4. El usuario puede agregar mora manual en loan_charges.
5. Sistema recalcula saldo.
```

---

# 20. Validaciones Importantes

## 20.1. Validaciones de empresa

- No permitir acceder a datos de otra empresa.
- Toda consulta debe recibir `company_id`.
- El `company_id` debe salir del contexto de sesión, no del cliente frontend sin validar.

## 20.2. Validaciones de usuario

- Email único.
- Contraseña segura.
- Usuario activo.
- Usuario debe pertenecer a la empresa activa.
- Usuario debe tener permiso para ejecutar la acción.

## 20.3. Validaciones de préstamo

- Monto prestado mayor que cero.
- Interés mayor o igual a cero.
- Fecha de vencimiento mayor o igual a fecha de inicio.
- Cliente debe pertenecer a la misma empresa.
- No permitir modificar montos principales si ya hay pagos, salvo regla especial.

## 20.4. Validaciones de pago

- Monto mayor que cero.
- Préstamo debe estar activo o vencido.
- Pago no debe registrarse en préstamo cancelado.
- Pago no debería exceder el saldo pendiente, salvo política explícita.
- Cobrador debe pertenecer a la misma empresa.

## 20.5. Validaciones de mora

- Monto mayor que cero.
- Préstamo debe tener saldo pendiente.
- Debe registrar motivo.
- Debe registrar usuario que aplicó la mora.

---

# 21. Seguridad Recomendada

## 21.1. Autenticación

- Guardar contraseñas usando Argon2 o bcrypt.
- No guardar tokens en texto plano.
- Usar access token de corta duración.
- Usar refresh token con hash almacenado en BD.
- Invalidar sesiones al cerrar sesión.

## 21.2. Autorización

- Aplicar RBAC por empresa.
- Validar permisos en backend.
- No confiar en controles del frontend.
- Verificar que el usuario pertenece a `company_id` antes de cada operación.

## 21.3. Multi-Tenant

- Nunca aceptar `company_id` como única fuente confiable desde el frontend.
- El backend debe resolver la empresa activa desde la sesión del usuario.
- Aplicar filtros obligatorios por empresa en todos los servicios.
- Usar FKs compuestas para reforzar integridad.

## 21.4. Auditoría

Auditar como mínimo:

```text
Creación de empresa
Creación de usuario de empresa
Cambio de rol
Creación de cliente
Edición de cliente
Creación de préstamo
Cancelación de préstamo
Registro de pago
Anulación de pago
Aplicación de mora
Cambio de configuración
```

---

# 22. Endpoints API Sugeridos

## 22.1. Autenticación

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

## 22.2. Empresas

```text
GET    /api/companies
POST   /api/companies
GET    /api/companies/:companyId
PUT    /api/companies/:companyId
```

## 22.3. Usuarios de Empresa

```text
GET    /api/company-users
POST   /api/company-users/invite
PUT    /api/company-users/:id
DELETE /api/company-users/:id
```

## 22.4. Roles y Permisos

```text
GET    /api/roles
POST   /api/roles
PUT    /api/roles/:id
DELETE /api/roles/:id
GET    /api/permissions
PUT    /api/roles/:id/permissions
```

## 22.5. Clientes

```text
GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
PUT    /api/customers/:id
DELETE /api/customers/:id
```

## 22.6. Préstamos

```text
GET    /api/loans
POST   /api/loans
GET    /api/loans/:id
PUT    /api/loans/:id
POST   /api/loans/:id/cancel
GET    /api/loans/overdue
```

## 22.7. Pagos

```text
GET    /api/loans/:loanId/payments
POST   /api/loans/:loanId/payments
POST   /api/payments/:id/void
```

## 22.8. Cargos / Mora

```text
GET    /api/loans/:loanId/charges
POST   /api/loans/:loanId/charges
POST   /api/charges/:id/void
```

## 22.9. Cobranza

```text
GET    /api/collection-routes
POST   /api/collection-routes
PUT    /api/collection-routes/:id
POST   /api/collection-routes/:id/customers
GET    /api/collection-visits
POST   /api/collection-visits
```

## 22.10. Reportes

```text
GET /api/reports/portfolio
GET /api/reports/overdue-loans
GET /api/reports/daily-payments
GET /api/reports/collector-payments
```

---

# 23. Pantallas Sugeridas para el MVP

## 23.1. Seguridad

- Login.
- Registro.
- Recuperar contraseña.

## 23.2. Empresa

- Crear empresa.
- Seleccionar empresa activa.
- Configuración de empresa.

## 23.3. Dashboard

Indicadores:

```text
Total prestado
Total pendiente
Total cobrado hoy
Préstamos activos
Préstamos vencidos
Clientes activos
```

## 23.4. Clientes

- Listado de clientes.
- Crear cliente.
- Editar cliente.
- Ver perfil del cliente.
- Ver préstamos del cliente.

## 23.5. Préstamos

- Listado de préstamos.
- Crear préstamo.
- Detalle de préstamo.
- Historial de pagos.
- Registrar pago.
- Agregar mora.
- Cancelar préstamo.

## 23.6. Cobranza

- Listado de rutas.
- Clientes por ruta.
- Registro de visita.
- Pagos por cobrador.

## 23.7. Administración

- Usuarios.
- Roles.
- Permisos.
- Configuración.

---

# 24. Consideraciones para Implementación Backend

## 24.1. Contexto de empresa activa

Después del login, el usuario puede seleccionar una empresa activa. El backend debe validar que el usuario pertenece a esa empresa.

El token o sesión puede contener:

```json
{
  "user_id": 1,
  "active_company_id": 10,
  "company_user_id": 100,
  "roles": ["Administrador"],
  "permissions": ["customers.view", "loans.create"]
}
```

## 24.2. Middleware recomendado

```text
authenticate()
resolveActiveCompany()
authorize(permissionCode)
```

Ejemplo:

```text
POST /api/customers
authenticate
resolveActiveCompany
authorize('customers.create')
```

## 24.3. Regla de oro

El frontend no debe ser la fuente confiable de `company_id`.  
El backend debe resolverlo desde la sesión o token validado.

---

# 25. Consideraciones para Frontend

## 25.1. Componentes principales

```text
AuthLayout
AppLayout
CompanySwitcher
Sidebar
PermissionGuard
CustomerForm
LoanForm
PaymentModal
LateFeeModal
CollectionVisitForm
DashboardCards
```

## 25.2. Navegación sugerida

```text
Dashboard
Clientes
Préstamos
Cobranza
Reportes
Administración
  - Usuarios
  - Roles
  - Configuración
```

## 25.3. Vistas críticas

- Perfil de cliente.
- Detalle de préstamo.
- Historial de pagos.
- Alerta visual de vencimiento.
- Botón para agregar mora manual.
- Botón para registrar pago.

---

# 26. Posibles Mejoras Futuras

Después del MVP, el proyecto podría evolucionar hacia:

- Generación de contratos en PDF.
- Firma digital o captura de firma.
- Fotografía del cliente o negocio.
- Geolocalización obligatoria en visitas.
- App móvil para cobradores.
- Sincronización offline.
- Cuotas calendarizadas.
- Mora automática.
- Refinanciamiento.
- Reestructuración de préstamos.
- Caja y liquidación diaria.
- Comisiones de cobradores.
- Reportería avanzada.
- Panel administrativo global.
- Suscripciones SaaS por empresa.
- Integración con WhatsApp para recordatorios.
- Notificaciones automáticas.
- Exportación a Excel/PDF.
- Integración con BI.

---

# 27. Riesgos Técnicos

| Riesgo | Mitigación |
|---|---|
| Cruce de datos entre empresas | Uso obligatorio de `company_id` y FKs compuestas |
| Saldos incorrectos | Procedimiento de recálculo y vista de validación |
| Pagos duplicados | Validaciones de backend y auditoría |
| Usuarios con múltiples empresas | Modelo `users` + `company_users` |
| Permisos mal aplicados | Middleware RBAC en backend |
| Crecimiento de datos | Índices por `company_id`, fechas y estados |
| Manipulación desde frontend | Validaciones de backend, no confiar en cliente |
| Anulación de pagos sin trazabilidad | Estados `VOIDED`, usuario anulador y auditoría |

---

# 28. Orden Recomendado de Desarrollo

## Fase 1: Base del sistema

```text
1. Crear base de datos.
2. Crear tablas de seguridad.
3. Crear tablas de empresa.
4. Implementar registro y login.
5. Implementar creación de empresa.
6. Implementar cambio de empresa activa.
```

## Fase 2: RBAC

```text
1. Crear permisos base.
2. Crear roles por empresa.
3. Asignar rol propietario al creador.
4. Implementar middleware de permisos.
```

## Fase 3: Clientes

```text
1. CRUD de clientes.
2. Búsqueda por nombre, teléfono o DUI.
3. Registro de referencias.
```

## Fase 4: Préstamos

```text
1. Crear préstamo.
2. Calcular interés simple.
3. Consultar saldo.
4. Cambiar estado.
```

## Fase 5: Pagos y Mora

```text
1. Registrar pago.
2. Recalcular saldo.
3. Anular pago.
4. Agregar mora manual.
5. Ver historial.
```

## Fase 6: Cobranza

```text
1. Crear rutas.
2. Asignar clientes a rutas.
3. Registrar visitas.
4. Registrar resultados.
```

## Fase 7: Reportes y Presentación

```text
1. Dashboard.
2. Cartera activa.
3. Créditos vencidos.
4. Pagos diarios.
5. Pagos por cobrador.
```

---

# 29. Conclusión

La propuesta plantea una base sólida para un MVP académico con enfoque realista y escalable. El diseño respeta los principios básicos de una aplicación SaaS multi-tenant, separando correctamente la identidad global del usuario, la pertenencia a empresas, los roles, los permisos y los datos operativos.

La simplificación financiera mediante préstamos con interés simple permite mantener el proyecto dentro de un alcance razonable para una presentación de cátedra, sin sacrificar la lógica esencial del negocio.

La estructura propuesta permite demostrar:

- Registro de empresas.
- Administración de usuarios y roles.
- Gestión de clientes.
- Creación de préstamos.
- Registro de pagos.
- Control de saldos.
- Alertas de vencimiento.
- Mora manual.
- Cobranza en campo.
- Aislamiento de información por empresa.

El modelo también deja una ruta clara para futuras ampliaciones, como cuotas, amortización avanzada, caja, reportes BI, app móvil y automatización de cobranza.

---

# 30. Resumen de Tablas Finales del MVP

```text
users
user_sessions
password_reset_tokens
login_attempts

companies
company_users
company_settings

permissions
roles
role_permissions
user_roles

customers
customer_references

loans
loan_payments
loan_charges

collection_routes
collection_route_customers
collection_visits

audit_logs
```

---

# 31. Regla Central del Diseño

```text
Toda entidad operativa pertenece a una empresa.
Toda consulta operativa debe filtrar por company_id.
Todo usuario se identifica globalmente por correo.
La relación usuario-empresa se maneja mediante company_users.
Los préstamos usan interés simple en el MVP.
Los pagos son arbitrarios y reducen el saldo.
La mora es manual y se registra como cargo adicional.
```

---

# 32. Gestión de Archivos Adjuntos (Perfil e Identificación)

Esta sección define el diseño minimo recomendado para soportar:

- Foto de perfil de usuarios y empleados.
- Imagen frontal y trasera de documento de identidad.
- Selfie o foto de validación.
- Archivos de respaldo de identificación.

## 32.1. Objetivo

Permitir carga, consulta y eliminación controlada de adjuntos sensibles, manteniendo:

- Aislamiento multi-tenant por `company_id`.
- Seguridad de acceso con JWT + RBAC.
- Trazabilidad de acciones en auditoría.
- Integridad entre MySQL y S3.

## 32.2. Arquitectura recomendada para Vercel + S3

Para evitar que el backend serverless procese binarios grandes en cada request, se recomienda flujo con URL firmada:

```text
Flutter App
    -> POST /api/files/upload-url (con JWT)
         -> Backend valida usuario, tenant, permiso, tipo y tamano
         -> Backend genera pre-signed URL de S3
    -> Flutter sube directo a S3 usando URL firmada
    -> POST /api/files/confirm (con JWT)
         -> Backend verifica objeto en S3 y guarda metadata en MySQL
```

Ventajas:

- Menor consumo de funciones serverless en Vercel.
- Mejor rendimiento para imagenes.
- Control centralizado de validaciones y auditoría.

## 32.3. Convención de rutas (keys) en S3

Usar prefijos por empresa para reforzar aislamiento:

```text
companies/{company_id}/users/{user_id}/profile/{uuid}.jpg
companies/{company_id}/customers/{customer_id}/id-front/{uuid}.jpg
companies/{company_id}/customers/{customer_id}/id-back/{uuid}.jpg
companies/{company_id}/customers/{customer_id}/selfie/{uuid}.jpg
companies/{company_id}/customers/{customer_id}/support/{uuid}.pdf
```

## 32.4. Tabla recomendada de adjuntos

Agregar la tabla `attachments`:

```sql
CREATE TABLE attachments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        company_id BIGINT UNSIGNED NOT NULL,
        public_id CHAR(36) NOT NULL,

        owner_type ENUM('USER', 'COMPANY_USER', 'CUSTOMER', 'LOAN_PAYMENT', 'COLLECTION_VISIT') NOT NULL,
        owner_id BIGINT UNSIGNED NOT NULL,

        category ENUM(
                'PROFILE_PHOTO',
                'ID_FRONT',
                'ID_BACK',
                'SELFIE_VERIFICATION',
                'SUPPORTING_DOCUMENT'
        ) NOT NULL,

        storage_provider ENUM('S3') NOT NULL DEFAULT 'S3',
        bucket_name VARCHAR(120) NOT NULL,
        object_key VARCHAR(1024) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_extension VARCHAR(20) NULL,
        size_bytes BIGINT UNSIGNED NOT NULL,
        checksum_sha256 CHAR(64) NULL,

        visibility ENUM('PRIVATE', 'INTERNAL') NOT NULL DEFAULT 'PRIVATE',
        status ENUM('UPLOADING', 'ACTIVE', 'REJECTED', 'DELETED') NOT NULL DEFAULT 'UPLOADING',

        uploaded_by_company_user_id BIGINT UNSIGNED NULL,
        reviewed_by_company_user_id BIGINT UNSIGNED NULL,
        reviewed_at DATETIME NULL,
        review_notes VARCHAR(500) NULL,

        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,

        PRIMARY KEY (id),
        UNIQUE KEY uq_attachments_public_id (public_id),
        UNIQUE KEY uq_attachments_company_id_id (company_id, id),
        UNIQUE KEY uq_attachments_bucket_object (bucket_name, object_key),
        KEY idx_attachments_company_owner (company_id, owner_type, owner_id),
        KEY idx_attachments_company_category (company_id, category),
        KEY idx_attachments_company_status (company_id, status),

        CONSTRAINT fk_attachments_company
                FOREIGN KEY (company_id)
                REFERENCES companies(id),

        CONSTRAINT fk_attachments_uploaded_by
                FOREIGN KEY (company_id, uploaded_by_company_user_id)
                REFERENCES company_users(company_id, id),

        CONSTRAINT fk_attachments_reviewed_by
                FOREIGN KEY (company_id, reviewed_by_company_user_id)
                REFERENCES company_users(company_id, id),

        CONSTRAINT chk_attachments_size
                CHECK (size_bytes > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Nota: para mantener flexibilidad del MVP, `owner_type + owner_id` evita crear una tabla por tipo de archivo. En una fase posterior puede evolucionar a tablas especializadas.

## 32.5. Endpoints sugeridos para archivos

```text
POST   /api/files/upload-url
POST   /api/files/confirm
GET    /api/files/:id/download-url
GET    /api/files?ownerType=&ownerId=&category=
DELETE /api/files/:id
POST   /api/files/:id/review
```

### Contrato minimo: `POST /api/files/upload-url`

Entrada sugerida:

```json
{
    "ownerType": "CUSTOMER",
    "ownerId": 123,
    "category": "ID_FRONT",
    "mimeType": "image/jpeg",
    "sizeBytes": 524288,
    "originalFileName": "dui_frente.jpg"
}
```

Salida sugerida:

```json
{
    "uploadId": "uuid",
    "publicId": "uuid",
    "bucket": "credimerc-prod-files",
    "objectKey": "companies/10/customers/123/id-front/uuid.jpg",
    "uploadUrl": "https://...",
    "expiresInSeconds": 300
}
```

## 32.6. Validaciones obligatorias de archivos

- Validar pertenencia a empresa activa (`company_id`) y estado de usuario no bloqueado/banned.
- Validar RBAC antes de generar URL firmada.
- Validar `mime_type` permitido por categoria.
- Validar tamano maximo por categoria.
- Validar extension y firma real del archivo (magic bytes).
- Rechazar ejecutables o tipos no permitidos.
- Limitar cantidad de archivos por entidad y categoria.

Ejemplo de limites sugeridos MVP:

```text
PROFILE_PHOTO: max 3 MB, image/jpeg, image/png, image/webp
ID_FRONT/ID_BACK: max 6 MB, image/jpeg, image/png
SELFIE_VERIFICATION: max 4 MB, image/jpeg, image/png
SUPPORTING_DOCUMENT: max 10 MB, image/jpeg, image/png, application/pdf
```

## 32.7. Seguridad de S3 y cumplimiento

- Bucket privado (sin ACL publica).
- Bloquear acceso publico a nivel bucket.
- Cifrado en reposo (SSE-S3 o SSE-KMS).
- URL firmadas de corta duracion para subir y descargar.
- Politica IAM de minimo privilegio para el backend.
- CORS restringido al dominio de app cliente.
- No exponer rutas internas de S3 en frontend como permanentes.

Para documentos de identidad, se recomienda `visibility = PRIVATE` obligatorio.

## 32.8. Auditoría especifica de adjuntos

Registrar en `audit_logs` al menos:

```text
files.upload_url_requested
files.upload_confirmed
files.download_url_requested
files.reviewed
files.deleted
files.rejected
```

Campos minimos adicionales recomendados en `new_values`:

```text
attachment_public_id
owner_type
owner_id
category
object_key
mime_type
size_bytes
```

## 32.9. Permisos RBAC sugeridos para archivos

Agregar permisos globales iniciales:

```text
files.profile.upload
files.profile.view
files.profile.delete
files.id.upload
files.id.view
files.id.review
files.id.delete
files.supporting.upload
files.supporting.view
files.supporting.delete
```

Para proteger PII, `files.id.view` y `files.id.review` deben asignarse solo a roles de confianza.

## 32.10. Integridad entre MySQL y S3

Estados recomendados:

```text
UPLOADING -> ACTIVE
UPLOADING -> REJECTED
ACTIVE -> DELETED
```

Reglas:

- Crear registro inicial en estado `UPLOADING` al generar URL firmada.
- Confirmar archivo con `HEAD` a S3 antes de cambiar a `ACTIVE`.
- Job programado diario para limpiar objetos huerfanos o registros atascados en `UPLOADING`.

## 32.11. Cambios al resumen de tablas del MVP

Agregar:

```text
attachments
```

## 32.12. Cambios al orden de desarrollo

Insertar una fase despues de seguridad base y antes de reportes:

```text
Fase de Archivos
1. Configurar bucket S3 privado y politicas IAM.
2. Implementar endpoint upload-url.
3. Implementar confirmacion y tabla attachments.
4. Implementar descarga con URL firmada.
5. Implementar auditoría y permisos RBAC de archivos.
6. Integrar formularios de Flutter para perfil y documentos.
```

Con esto, la propuesta cubre de forma explicita la carga de fotos de perfil y documentos de identificación con un enfoque compatible con Vercel, Express.js, MySQL en RDS y S3.
