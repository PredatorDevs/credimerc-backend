# CrediMerc Backend

Base inicial para API en ExpressJS desplegable en Vercel, conectada a MySQL (AWS RDS) y almacenamiento de archivos en S3.

## Estructura inicial

- `database/migrations`: scripts SQL
- `api/contracts`: contratos OpenAPI
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
3. Ejecutar migracion SQL de `database/migrations/001_attachments.sql`
   - Luego ejecutar `database/migrations/002_file_audit_helpers.sql`
4. Levantar API:
   - `npm run dev`

## Rutas del modulo files

- `POST /api/files/upload-url`
- `POST /api/files/confirm`
- `GET /api/files/:id/download-url`
- `GET /api/files`
- `DELETE /api/files/:id`
- `POST /api/files/:id/review`

## Pruebas rapidas

- Archivo HTTP de pruebas: `api/contracts/files.http`
- Contrato OpenAPI: `api/contracts/files.openapi.yaml`

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
