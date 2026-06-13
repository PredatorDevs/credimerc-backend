# Plan de Cierre MVP (2 Sprints)

## Objetivo
Cerrar las brechas detectadas entre la implementacion actual y la propuesta tecnica para llegar a un MVP presentable end-to-end.

## Estado actual resumido
Ya implementado:
- Auth base (register, login, refresh, logout, me, select-company)
- Empresas (listar, crear)
- Clientes (CRUD)
- Prestamos (CRUD parcial + overdue + cancel)
- Pagos (listar, registrar, anular)
- Adjuntos (upload-url, confirm, list, download-url, delete)
- Frontend Flutter para flujo principal (login, home, clientes, prestamos, pagos, adjuntos)

Faltantes MVP segun propuesta:
- Usuarios internos de empresa (company-users)
- RBAC administrable (roles/permisos/user_roles)
- Mora manual (loan_charges)
- Cobranza (routes, route_customers, visits)
- Reportes operativos
- Recuperacion de contrasena y verificacion de correo
- Auditoria de acciones criticas

---

## Sprint 1 (Infra funcional y control de acceso)
Duracion sugerida: 1 semana

### Objetivo del sprint
Completar administracion interna y seguridad basica para habilitar operacion multiusuario por empresa.

### Entregables Backend
1. Modulo `company-users`
- Endpoints:
  - `GET /api/company-users`
  - `POST /api/company-users/invite`
  - `PUT /api/company-users/:id`
  - `DELETE /api/company-users/:id`
- Reglas:
  - Solo usuarios con permiso adecuado.
  - Toda operacion filtrada por `active_company_id`.

2. Modulo RBAC administrable
- Endpoints:
  - `GET /api/permissions`
  - `GET /api/roles`
  - `POST /api/roles`
  - `PUT /api/roles/:id`
  - `DELETE /api/roles/:id`
  - `PUT /api/roles/:id/permissions`
  - `PUT /api/company-users/:id/roles`
- Reglas:
  - No romper permisos base del owner.
  - Recalcular permisos efectivos para el token en login/refresh/select-company.

3. Seguridad extendida minima
- Endpoints:
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
- Persistencia:
  - usar `password_reset_tokens` con expiracion y uso unico.

4. Auditoria basica
- Registrar en `audit_logs` al menos:
  - creacion/edicion/baja de company-user
  - cambios de rol/permisos
  - reset de contrasena

### Entregables Frontend (Flutter)
1. Seccion Administracion
- Pantalla de usuarios de empresa (listar + cambiar estado).
- Pantalla de roles (crear/editar + asignar permisos).
- Pantalla de asignacion de roles por usuario.

2. Pantallas de seguridad
- Recuperar contrasena.
- Restablecer contrasena con token.

### Criterios de aceptacion Sprint 1
- Un propietario puede invitar y administrar usuarios de su empresa.
- Un administrador con permisos limitados no puede ejecutar acciones no autorizadas.
- Se puede solicitar y completar reset de contrasena.
- Cada accion critica del sprint genera registro en `audit_logs`.

---

## Sprint 2 (Operacion financiera y cierre de presentacion)
Duracion sugerida: 1 semana

### Objetivo del sprint
Completar la operacion financiera de campo y visibilidad ejecutiva para demo final.

### Entregables Backend
1. Modulo de mora manual (`loan_charges`)
- Endpoints:
  - `GET /api/loans/:loanId/charges`
  - `POST /api/loans/:loanId/charges`
  - `POST /api/charges/:id/void`
- Reglas:
  - monto > 0
  - motivo obligatorio
  - recalculo transaccional de saldo/estado

2. Modulo de cobranza
- Endpoints:
  - `GET /api/collection-routes`
  - `POST /api/collection-routes`
  - `PUT /api/collection-routes/:id`
  - `POST /api/collection-routes/:id/customers`
  - `GET /api/collection-visits`
  - `POST /api/collection-visits`
- Reglas:
  - collector pertenece a empresa
  - visitas opcionalmente asociadas a pago

3. Reportes MVP
- Endpoints:
  - `GET /api/reports/portfolio`
  - `GET /api/reports/overdue-loans`
  - `GET /api/reports/daily-payments`
  - `GET /api/reports/collector-payments`

4. Auditoria extendida
- Registrar:
  - creacion/anulacion de mora
  - creacion/edicion de rutas
  - registro de visitas
  - consultas de reportes (opcional para MVP, recomendado)

### Entregables Frontend (Flutter)
1. Prestamos
- Agregar mora manual desde detalle/lista de prestamo.
- Ver historial de cargos en la vista de pagos/detalle.

2. Cobranza
- Pantallas de rutas, asignacion de clientes y visitas.

3. Dashboard/Reportes
- Cards KPI:
  - total prestado
  - total pendiente
  - total cobrado hoy
  - prestamos activos
  - prestamos vencidos
  - clientes activos
- Vistas de reportes basicas consumiendo endpoints nuevos.

### Criterios de aceptacion Sprint 2
- Se puede aplicar y anular mora manual con impacto correcto en saldo.
- Se pueden crear rutas, asignar clientes y registrar visitas.
- Dashboard y reportes muestran datos reales por empresa activa.
- Auditoria cubre acciones financieras criticas.

---

## Orden de ejecucion recomendado (tecnico)
1. Backend: `company-users` + RBAC APIs.
2. Backend: forgot/reset password + auditoria base.
3. Frontend: pantallas administracion.
4. Backend: `loan_charges` y recalculo robusto.
5. Frontend: mora manual en prestamos.
6. Backend: cobranza y reportes.
7. Frontend: cobranza + dashboard final.
8. Pruebas integrales y guion de demo.

---

## Definicion de "MVP terminado"
Se considera terminado cuando:
- Todo flujo opera por `active_company_id` sin cruces de tenant.
- Hay administracion funcional de usuarios/roles/permisos.
- Existen prestamos, pagos y mora manual con saldo consistente.
- Se puede registrar cobranza de campo (rutas + visitas).
- Hay reportes minimos y dashboard para presentacion.
- Hay trazabilidad minima de eventos criticos.

---

## Siguiente paso inmediato (hoy)
Iniciar Sprint 1 por backend en este orden:
1. Crear modulo `company-users` (routes/controller/service/validation).
2. Exponer modulo RBAC (`roles` y `permissions`).
3. Agregar registro en `audit_logs` para acciones de administracion.
