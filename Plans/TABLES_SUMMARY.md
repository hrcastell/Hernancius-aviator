# Resumen Rápido de Tablas - Hernancius Aviation

## 📋 10 Tablas Principales

> **Stack**: PostgreSQL 10.23 + Node.js 20/Express 5 (SQL plano con `pg`). **v2 SaaS multiusuario**: además de las 10 tablas de dominio existen tablas de identidad/seguridad, billing, normativa, educación y evaluación (ver abajo). Ver `DATABASE_SCHEMA.md`.

## 🧩 Tablas SaaS (v2)

| Grupo | Tablas | Propósito |
|-------|--------|-----------|
| Infraestructura | `schema_migrations` | Control de migraciones |
| Identidad y seguridad | `app_user`, `oauth_identity`, `user_session`, `audit_log`, `stored_file`, `legal_acceptance`, `data_request` | Login Google/Facebook sin contraseñas, roles student/admin, sesiones revocables, auditoría, archivos seguros, consentimientos y derechos de titulares (Ley 19.628 / 21.719) |
| Billing (Mercado Pago, CLP) | `billing_plan`, `billing_customer`, `subscription`, `billing_event` | Plan mensual 5.000 CLP, suscripciones (preapproval), log de webhooks idempotente. Sin datos de tarjeta |
| Normativa | `authority`, `regulation_reference`, `subject_regulation`, `lesson_regulation`, `question_regulation` | DGAC Chile (DAN/DAR) y futuras autoridades LATAM; marca contenido a revisar cuando cambia una norma |
| Educación | `subject`, `course_module`, `lesson`, `lesson_revision`, `lesson_asset`, `lesson_progress` | Materias PPL → módulos → lecciones versionadas, recursos y progreso por usuario |
| Evaluación | `question`, `question_revision`, `exam_template`, `exam_template_subject`, `exam_attempt`, `exam_attempt_item` | Banco de preguntas versionado, quizzes/simulacros ponderados con tiempo, historial |


### 👤 Datos del Piloto (3 tablas)

1. **`pilot`** - Información personal del piloto
   - Nombre, apellido, licencia
   - **Fechas de vencimiento** (licencia, médico) → ALERTAS
   - Total de horas acumuladas
   - Un perfil de piloto por usuario (`app_user`)

2. **`pilot_licenses`** 
   - Certificaciones adicionales
   - IFR, Multi-engine, SEL, etc.
   - Fechas de emisión y vencimiento
   - Documentos escaneados

3. **`pilot_logbook`** - Bitácora personal
   - Horas por categoría (PIC, SIC, dual, night, IFR, etc.)
   - Aterrizajes, aproximaciones
   - Cumple regulaciones FAA/EASA

---

### ✈️ Datos de Aeronaves (5 tablas)

4. **`aircraft_manufacturer`** - Fabricantes
   - Cessna, Piper, Beechcraft, etc.
   - Datos pre-cargados

5. **`aircraft_model`** - Modelos de aeronaves
   - C172, PA-28, SR22, etc.
   - Parámetros base de performance
   - Consumo, velocidades, pesos
   - Datos pre-cargados

6. **`aircraft`** - Aeronaves del usuario
   - Matrícula, año, dueño/arrendado
   - Hobbs, Tach
   - **Vencimientos** (seguro, registro, aeronavegabilidad) → ALERTAS
   - Parámetros personalizados

7. **`aircraft_logbook`** - Mantenimiento
   - Inspecciones, reparaciones
   - Próximo servicio → ALERTAS
   - Costos, documentos

8. **`flight_log`** - Registro de vuelos
   - Cada vuelo realizado
   - Ruta, tiempos, combustible
   - Plan de vuelo y cálculos (JSON)
   - Actualiza automáticamente: pilot.total_hours, aircraft.hobbs, aircraft.tach

---

### 🛠️ Configuración (2 tablas)

9. **`checklist_template`** - Checklists
   - Por fase: preflight, takeoff, landing, etc.
   - Personalizables por modelo o por aeronave del usuario
   - Interactivos (items en JSONB) o documento subido (PDF/imagen vía `stored_file`)
   - Modo paso a paso en la app

10. **`user_preferences`** - Preferencias
    - Unidades preferidas (velocidad, distancia, combustible, etc.)
    - Idioma
    - Días para alertas
    - Tema (light/dark/auto)
    - Una fila por usuario

---

## 🔔 Sistema de Alertas Automáticas

**Al iniciar sesión / abrir el dashboard, verifica (endpoint `GET /api/v1/alerts`):**

| Tipo | Fuente | Días Antes | Acción |
|------|--------|------------|--------|
| Licencia de piloto | `pilot.license_expiry_date` | 30 | Modal con advertencia |
| Certificado médico | `pilot.medical_expiry_date` | 60 | Modal con advertencia |
| Ratings/certificaciones | `pilot_licenses.expiry_date` | 30 | Modal con advertencia |
| Seguro aeronave | `aircraft.insurance_expiry` | 30 | Modal con advertencia |
| Registro aeronave | `aircraft.registration_expiry` | 30 | Modal con advertencia |
| Aeronavegabilidad | `aircraft.airworthiness_expiry` | 30 | Modal con advertencia |
| Mantenimiento programado | `aircraft_logbook.next_service_hours` vs `aircraft.hobbs_time` | 5 horas | Modal con advertencia |

**Colores de alerta:**
- 🟢 >30 días
- 🟡 15-30 días  
- 🟠 7-14 días
- 🔴 <7 días o vencido

---

## 📊 Relaciones Clave

```
app_user (1)
  ├── pilot (1)
  ├── aircraft (N)
  └── user_preferences (1)

pilot (1)
  ├── pilot_licenses (N)
  ├── pilot_logbook (N)
  └── flight_log (N)

aircraft_manufacturer (1)
  └── aircraft_model (N)
        └── aircraft (N)
              ├── aircraft_logbook (N)
              └── flight_log (N)

flight_log
  ├── pilot_id → pilot
  └── aircraft_id → aircraft
```

---

## 🚀 Campos Calculados Automáticamente

1. **`pilot.total_hours`**
   - Suma de todos los `flight_log.flight_time`
   - Se actualiza con cada vuelo

2. **`aircraft.hobbs_time`**
   - Último `flight_log.hobbs_end`
   - Se actualiza con cada vuelo

3. **`aircraft.tach_time`**
   - Último `flight_log.tach_end`
   - Se actualiza con cada vuelo

4. **Entrada automática en `pilot_logbook`**
   - Al registrar un `flight_log`
   - Copia datos relevantes para cumplir regulaciones

> Todos estos cálculos se ejecutan en la capa de servicio del backend (Node.js) dentro de una única transacción SQL, no con triggers.

---

## 💾 Consideraciones de Diseño

### ✅ Minimalista
- Solo 10 tablas esenciales
- Campos JSONB para flexibilidad sin crear nuevas tablas
- Datos pre-cargados para rapidez

### ✅ Ágil para Vuelo
- Índices en campos de búsqueda frecuente
- Cálculos automáticos (no requiere intervención)
- Acceso rápido a última aeronave usada

### ✅ Cumple Regulaciones
- `pilot_logbook` cumple FAA/EASA
- `aircraft_logbook` cumple requisitos de mantenimiento
- Alertas de vencimientos

### ✅ Servidor como Fuente de Verdad
- Todo se almacena en PostgreSQL 10.23 (hosting)
- Acceso vía API REST autenticada (JWT en cookie httpOnly + CSRF)
- Datos aislados por usuario; funciones pagadas protegidas por suscripción
- Exportación a Excel para respaldos
- Modo offline: idea en backlog (ver `DEVELOPMENT_PLAN.md`)

---

**Versión**: 1.1.0  
**Fecha**: 20 de octubre de 2026 (v2: SaaS multiusuario, PostgreSQL 10.23 + Node.js 20/Express 5)
