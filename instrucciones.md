Proyecto de agenda de citas tipo Booksy: guía para empezar + primer MVP
1) Objetivo del producto
Construir una plataforma de reservas online para negocios de servicios (peluquería, barbería, uñas, estética, etc.) donde:

Un Superadministrador da de alta a los negocios y a sus dueños en el sistema.

El negocio configura servicios, personal y la duración base de sus huecos (rejilla de horarios).

El cliente reserva una cita en pocos pasos sin generar "huecos muertos" en la agenda.

El staff gestiona su agenda diaria.

Resultado esperado del MVP: permitir que un negocio real pueda publicar su página de reservas y recibir citas de forma optimizada y sin intervención manual.

2) Problema que resuelve (hipótesis)
Hoy muchos negocios gestionan citas por WhatsApp/llamadas y pierden tiempo.

Existen errores de sobre-reserva y olvidos.

No hay visibilidad de disponibilidad en tiempo real para el cliente.

La gestión manual o los sistemas mal diseñados generan fragmentación (huecos de 5 o 10 minutos donde no cabe ningún servicio).

Hipótesis MVP:

Si el cliente puede reservar en menos de 2 minutos, aumenta la conversión.

Si el staff tiene agenda unificada y bloqueos, bajan conflictos de horarios.

Si la disponibilidad se calcula en intervalos fijos, se optimiza la ocupación diaria al 100%.

Si hay confirmación automática, baja el trabajo administrativo del negocio.

3) Alcance del primer MVP (lo mínimo que SÍ debe existir)
Módulo A: Superadministración y Cuenta

Login exclusivo para el Superadministrador.

Alta de negocio y creación de la cuenta del Owner (dueño) por parte del Superadmin.

Login del Owner a su panel de control.

Onboarding básico del Owner (crear primer servicio y primer staff).

Módulo B: Catálogo y equipo

CRUD de servicios (nombre, duración, precio, activo/inactivo).

CRUD de staff (nombre, email, activo/inactivo).

Asignación de qué staff puede hacer qué servicio.

Módulo C: Horarios y Motor de Disponibilidad

Horario semanal por staff.

Bloqueos manuales (time off) por staff.

Motor de disponibilidad basado en intervalos fijos (Rejilla/Grid) para devolver slots limpios.

Módulo D: Reserva pública

Página pública por negocio (slug).

Flujo de reserva: servicio → staff → fecha/hora → datos cliente → confirmar.

Creación de cita con estado inicial confirmado.

Módulo E: Agenda interna

Vista de citas por día para dueño/staff.

Cambio de estado de cita (confirmada, completada, cancelada).

Módulo F: Notificaciones mínimas

Email de confirmación al cliente.

Email de nueva cita al negocio/staff.

4) Qué NO entra en MVP (para no sobrecargar)
Auto-registro de negocios (self-service onboarding). El alta la hace el Superadmin.

Pagos online integrados.

Marketplace con búsqueda global de negocios.

App móvil nativa (solo web responsiva).

Programa de fidelización/puntos.

Reportería avanzada/BI.

Integraciones externas complejas (Google Calendar bidireccional, POS, etc.).

5) Roles y permisos del MVP
SUPERADMIN: Rol global del sistema. Crea los negocios y gestiona a los dueños (Owners).

OWNER: Administra su negocio, servicios, staff, horarios y citas.

STAFF: Ve y gestiona solo sus citas y bloqueos.

CLIENT: Reserva cita y consulta/cancela su reserva (si habilitado).

6) Stack recomendado (100% JavaScript, rápido de construir y escalar)
Frontend: Vue 3 + TypeScript + Vite. (Aplicar skills/patrones de diseño UI frontend aquí, usando librerías como Tailwind CSS o Vuetify para agilizar).

Backend: Node.js + Express + TypeScript. (Aplicar skills de diseño de arquitectura de software, separando rutas, controladores y servicios).

Base de datos: MySQL 8.

ORM: Prisma.

Auth: JWT (access + refresh opcional en MVP).

Validación: Zod/Joi.

Emails: Resend, SendGrid o SMTP.

Infra inicial: Docker Compose para local; despliegue en Render/Railway/Fly o VPS.

7) Modelo de datos del MVP (entidades clave)
users: id, email, password_hash, role (SUPERADMIN/OWNER/STAFF/CLIENT), name, created_at

businesses: id, owner_id (FK), name, slug, phone, timezone, slot_interval_minutes (ej. 15, 20 o 30), settings_json, created_at

staff_profiles: id, user_id, business_id, is_active, created_at

services: id, business_id, name, duration_min, price, is_active

staff_services: staff_id, service_id

schedules: id, staff_id, day_of_week, start_time, end_time

time_offs: id, staff_id, start_datetime_utc, end_datetime_utc, reason

appointments: id, business_id, client_id, staff_id, service_id, start_datetime_utc, end_datetime_utc, status

appointment_events (opcional simple): id, appointment_id, type, payload_json, created_at

Notas críticas:

Guardar fechas en UTC y convertir por timezone en frontend.

El campo slot_interval_minutes en businesses es vital para crear la "rejilla" del calendario y evitar huecos.

Añadir índices en appointments por (staff_id, start_datetime_utc).

8) Reglas de negocio clave y Gestión de Huecos
Lógica de la Rejilla (Grid) para evitar fragmentación:

El negocio define un slot_interval_minutes (por ejemplo, 30 minutos).

Las horas disponibles solo se ofrecen en múltiplos de ese intervalo (ej. 10:00, 10:30, 11:00). No se permite reservar a las 10:15 si el intervalo es 30.

La duración de los servicios debe ser múltiplo de este intervalo (ej. 30, 60, 90 min) para encajar como bloques exactos y no dejar "huecos muertos".

Un slot solo es válido si:

Cae en un punto exacto de la rejilla.

Está dentro del horario del staff.

No pisa un bloqueo (time_off).

No se solapa con otra cita activa (ni el inicio ni el transcurso de la duración del servicio).

Estados de cita permitidos:

CONFIRMED -> COMPLETED

CONFIRMED -> CANCELLED

No permitir reservas en el pasado.

Ventana de reserva configurable (ej. máximo 60 días hacia adelante).

9) Endpoints mínimos (API)
Auth

POST /auth/login

Superadmin

POST /admin/businesses (Crea el negocio y el owner simultáneamente)

GET /admin/businesses

Business (Owner)

GET /business/me

PATCH /business/me

Services & Staff

GET /services | POST /services | PATCH /services/:id | DELETE /services/:id

GET /staff | POST /staff | PATCH /staff/:id | PATCH /staff/:id/schedule | POST /staff/:id/time-offs

Public booking

GET /public/:slug/services

GET /public/:slug/staff?serviceId=...

GET /public/:slug/availability?serviceId=...&staffId=...&date=... (Este endpoint ejecuta el algoritmo de la rejilla)

POST /public/:slug/book

Appointments

GET /appointments?from=...&to=...&staffId=...

PATCH /appointments/:id/status

10) UX del MVP (pantallas mínimas)
Panel Superadmin:

Login de Superadmin.

Dashboard con lista de negocios y botón "Dar de alta Negocio/Owner".

Backoffice (Owner/Staff):

Login.

Onboarding (primer servicio + primer staff).

Gestión de servicios, staff y horarios base.

Calendario diario/semanal (renderizado en bloques basados en el slot_interval_minutes).

Pública cliente:

Selección de servicio → Selección de staff → Selección de fecha y hora (solo en slots limpios) → Formulario de cliente → Confirmación final.

Regla UX: máximo 5 pasos y feedback claro en cada acción.

11) Métricas de éxito del MVP
% reservas completadas por visita a página pública.

Tiempo promedio para completar una reserva.

Nº de citas creadas por negocio por semana.

Tasa de cancelación.

Nº de conflictos de agenda o huecos inservibles (objetivo: 0).

12) Plan de ejecución en 30 días
Semana 1: Base técnica. Inicializar repos (Vue y Node). Configurar Prisma, base de datos y modelo de roles (incluyendo Superadmin y auth JWT).

Semana 2: Core de negocio. Panel de Superadmin para dar de alta negocios. CRUD de servicios/staff y horarios en el backoffice del Owner.

Semana 3: Motor de disponibilidad. Lógica de la rejilla (Grid) de horarios. Flujo público completo de reserva asegurando cero solapamientos.

Semana 4: Agenda y Calidad. Vista de agenda interna. Cambios de estado. Emails de confirmación. Tests de la lógica de solapamiento.

13) Priorización técnica (muy importante)
Prioridad 1 (bloqueante): Integridad del calendario usando la rejilla de intervalos (sin solapes ni fragmentación), manejo correcto de zona horaria y seguridad de roles.

Prioridad 2: Arquitectura limpia en Node/Express y experiencia fluida en Vue 3 aplicando buenas skills de diseño frontend.

Prioridad 3: Diseño visual premium y funciones avanzadas no críticas.

14) Riesgos comunes y mitigación
Fragmentación de la agenda: Mitigar forzando el uso de un slot_interval_minutes estricto en el motor de disponibilidad.

Problemas de timezone: Mitigar guardando todo en UTC + timezone del negocio.

Scope creep (querer meter todo): Mitigar con backlog de "post-MVP" y congelar alcance 4 semanas.

15) Backlog post-MVP (cuando ya funcione lo básico)
Auto-registro de negocios (quitar dependencia del Superadmin).

Recordatorios por WhatsApp/SMS.

Pagos en línea (señal/anticipo).

Reprogramación automática por cliente.

Cupones/promociones.

Dashboard financiero y multi-sucursal.

16) Checklist de “MVP listo para pilotear”
[ ] El Superadmin puede registrar un negocio y crear su Owner.

[ ] El Owner puede configurar su rejilla de horarios, servicios y staff.

[ ] Un cliente externo puede reservar sin generar huecos muertos en la agenda.

[ ] El sistema evita solapes de citas por concurrencia.

[ ] Owner y staff ven/actualizan citas en su panel.

[ ] Se envían confirmaciones por email.

17) Flujo de la aplicación explicado paso a paso
A) Flujo del Superadmin (El Origen)

Inicia sesión con credenciales maestras.

Da de alta un negocio ("Peluquería Central") y le asigna un email de Owner.

El sistema crea el negocio, el usuario OWNER y le proporciona las credenciales de acceso iniciales.

B) Flujo del Owner (Configuración inicial)

Hace login con la cuenta creada por el Superadmin.

Define la configuración de su agenda (Ej. Zona horaria: Madrid, Intervalo de huecos: 30 minutos).

Añade servicios (ej: Corte de 30 min, Tinte de 60 min).

Da de alta a su Staff y define sus horarios de trabajo.

Comparte su enlace público de reservas.

C) Flujo del Cliente (Reserva óptima)

Abre la página pública del negocio.

Selecciona servicio (ej: Tinte, 60 min) y profesional.

El motor de disponibilidad calcula la rejilla. Si el staff trabaja de 10:00 a 14:00, muestra: 10:00, 10:30, 11:00... (evitando horas sueltas como 10:15).

Escoge la hora, introduce sus datos y confirma.

Se crea la cita en estado CONFIRMED y se envían emails.

D) Flujo del Staff (Operativa diaria)

El staff accede y ve su agenda del día (con las citas encajadas como bloques exactos).

Visualiza las citas, atiende al cliente y cambia el estado a COMPLETED.

Si surge una urgencia, añade un bloqueo puntual (time off) que desactiva esos bloques en el motor de reservas.

E) Qué pasa por detrás (backend) cuando alguien reserva

Valida servicio, staff e intervalo de rejilla.

Recalcula disponibilidad en ese instante (doble validación contra concurrencia).

Verifica que no hay solape con otras citas ni con bloqueos en la base de datos (UTC).

Crea la cita (appointment) y envía notificaciones.

F) Regla mental simple para entender todo el producto

Configurar capacidad (Superadmin crea cuenta → Owner define rejilla, servicios y horarios).

Vender capacidad en bloques exactos (reserva pública).

Ejecutar capacidad (agenda staff y estados).