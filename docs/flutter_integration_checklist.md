# Flutter Integration Checklist (CrediMerc)

## 1. Base setup

- [ ] Configurar `baseUrl` por entorno (dev/staging/prod).
- [ ] Definir un cliente HTTP comun para todas las llamadas.
- [ ] Agregar interceptores para adjuntar `Authorization: Bearer <accessToken>`.
- [ ] Centralizar parseo de respuesta estandar:
  - exito: `{ success: true, data, message, meta }`
  - error: `{ success: false, error, message, details }`

## 2. Sesion y tokens

- [ ] Guardar `accessToken` y `refreshToken` de forma segura.
- [ ] Renovar token automaticamente al recibir 401 usando `POST /api/auth/refresh`.
- [ ] Reintentar la peticion original despues de refresh exitoso.
- [ ] Forzar logout si refresh falla.

## 3. Flujo de autenticacion

- [ ] Pantalla registro integrada con `POST /api/auth/register`.
- [ ] Pantalla login integrada con `POST /api/auth/login`.
- [ ] Cargar perfil inicial con `GET /api/auth/me`.
- [ ] Implementar selector de empresa con `POST /api/auth/select-company`.

## 4. Flujo de empresas

- [ ] Listar empresas del usuario con `GET /api/companies`.
- [ ] Crear empresa con `POST /api/companies`.
- [ ] Confirmar que al crear empresa se recibe bootstrap completo (roles/settings).

## 5. Flujo de clientes

- [ ] Listado paginado de clientes con `GET /api/customers`.
- [ ] Busqueda por texto/estado en listado.
- [ ] Crear cliente con `POST /api/customers`.
- [ ] Editar cliente con `PUT /api/customers/:id`.
- [ ] Desactivar cliente con `DELETE /api/customers/:id`.

## 6. Flujo de prestamos

- [ ] Listado de prestamos con `GET /api/loans`.
- [ ] Crear prestamo con `POST /api/loans`.
- [ ] Ver detalle con `GET /api/loans/:id`.
- [ ] Editar prestamo (reglas de negocio) con `PUT /api/loans/:id`.
- [ ] Cancelar prestamo con `POST /api/loans/:id/cancel`.
- [ ] Vista de vencidos con `GET /api/loans/overdue`.

## 7. Flujo de pagos

- [ ] Listar pagos por prestamo con `GET /api/loans/:loanId/payments`.
- [ ] Registrar pago con `POST /api/loans/:loanId/payments`.
- [ ] Anular pago con `POST /api/payments/:id/void`.
- [ ] Refrescar detalle de prestamo tras pago/anulacion.

## 8. Flujo de archivos

- [ ] Solicitar URL de subida con `POST /api/files/upload-url`.
- [ ] Subir archivo directo a S3 con la URL firmada.
- [ ] Confirmar subida con `POST /api/files/confirm`.
- [ ] Obtener URL temporal de descarga con `GET /api/files/:id/download-url`.
- [ ] Listar adjuntos por owner con `GET /api/files`.

## 9. Permisos y UX

- [ ] Ocultar acciones no permitidas segun `permissions` del token.
- [ ] Mostrar mensajes de error usando `message` y `details`.
- [ ] Bloquear acciones para usuarios inactivos/banned.

## 10. Pruebas MVP recomendadas

- [ ] Caso feliz completo: registro -> empresa -> cliente -> prestamo -> pago -> adjunto.
- [ ] Error de permiso: intentar accion sin permiso.
- [ ] Error de negocio: pago mayor al saldo.
- [ ] Cambio de empresa activa y validacion de aislamiento tenant.
- [ ] Reconexion con refresh token expirado (logout forzado).
