# CrediMerc Backend

Base inicial para API en ExpressJS desplegable en Vercel, conectada a MySQL (AWS RDS) y almacenamiento de archivos en S3.

## Estructura inicial

- `database/migrations`: scripts SQL
- `api/contracts`: contratos OpenAPI
- `src/modules/auth`: registro, login, refresh, logout, perfil y seleccion de empresa activa
- `src/modules/customers`: CRUD de clientes por empresa activa
- `src/modules/loans`: CRUD de prestamos por empresa activa y consulta de vencidos
- `src/modules/payments`: pagos por prestamo, anulacion y recálculo de saldo
- `src/modules/files`: modulo de adjuntos (upload-url, confirm, download-url, list, delete, review)
- `src/middlewares`: auth, company activa, no baneado, autorizacion RBAC

## Requisitos

- Node.js 20+
- MySQL 8+
- Bucket S3 privado

## Inicio rapido

1. Instalar dependencias:
   - `npm install`
2. Copiar variables:
   - `copy .env.example .env` (Windows)
3. Ejecutar migraciones SQL en este orden:
   - `database/migrations/000_core_schema.sql`
   - `database/migrations/001_attachments.sql`
   - `database/migrations/002_file_audit_helpers.sql`
   - `database/migrations/003_seed_permissions_base.sql`
   - `database/migrations/004_views.sql`
   - `database/migrations/005_procedures.sql`
   - `database/migrations/006_company_bootstrap.sql`
   - `database/migrations/007_demo_seed_data.sql` (solo local/desarrollo)
4. Levantar API:
   - `npm run dev`

## Bootstrap por empresa

Despues de crear una nueva empresa y su registro en company_users con is_owner=1, ejecutar:

- `CALL usp_bootstrap_company_defaults(<company_id>, <owner_company_user_id>);`

Esto inicializa:

- Roles por defecto: Propietario, Administrador, Supervisor, Cobrador, Solo Lectura.
- Permisos por rol.
- Configuraciones base en company_settings.
- Asignacion del rol Propietario al owner de la empresa.

## Rutas del modulo files

- `POST /api/files/upload-url`
- `POST /api/files/confirm`
- `GET /api/files/:id/download-url`
- `GET /api/files`
- `DELETE /api/files/:id`
- `POST /api/files/:id/review`

## Rutas del modulo auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/select-company`

## Rutas del modulo companies

- `GET /api/companies`
- `POST /api/companies` (crea company + owner + bootstrap automatico)

## Rutas del modulo customers

- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id` (desactivacion logica)

## Rutas del modulo loans

- `GET /api/loans`
- `POST /api/loans`
- `GET /api/loans/overdue`
- `GET /api/loans/:id`
- `PUT /api/loans/:id`
- `POST /api/loans/:id/cancel`

## Rutas del modulo payments

- `GET /api/loans/:loanId/payments`
- `POST /api/loans/:loanId/payments`
- `POST /api/payments/:id/void`

## Pruebas rapidas

- Archivo HTTP de auth: `api/contracts/auth.http`
- Archivo HTTP de pruebas: `api/contracts/files.http`
- Archivo HTTP de empresas: `api/contracts/companies.http`
- Archivo HTTP de customers: `api/contracts/customers.http`
- Archivo HTTP de loans: `api/contracts/loans.http`
- Archivo HTTP de payments: `api/contracts/payments.http`
- Contrato OpenAPI: `api/contracts/files.openapi.yaml`

## Datos demo

- Migration/script: `database/migrations/007_demo_seed_data.sql`
- Ejecutar una vez creado el procedimiento:
   - `CALL usp_seed_demo_data();`

## Deploy en Vercel

- Archivo de entrada serverless: `api/index.js`
- Configuracion de rutas: `vercel.json`
- Variables de entorno requeridas: revisar `.env.example`

Notas importantes para produccion:

- Usar bucket S3 privado con bloqueo de acceso publico.
- Configurar IAM de minimo privilegio para la API.
- Usar JWT robusto y rotacion de secretos.

## Nota

Este scaffold implementa el flujo recomendado para serverless: URL firmada y subida directa desde Flutter a S3.
