# Esquema de Base de Datos - Hernancius Aviation

## Filosofía de Diseño

**Minimalista y Ágil**: Este esquema está diseñado para ser ligero y rápido, considerando que el piloto debe acceder a la información durante el vuelo. Solo las tablas esenciales con campos estrictamente necesarios.

**Servidor como fuente de verdad (PostgreSQL 10.23)**:
- **Motor**: PostgreSQL **10.23** (hosting cPanel compartido — supuesto a confirmar). En desarrollo local: Docker Compose con la imagen `postgres:10`.
- **Acceso**: Backend Node.js + Express 5 con el driver `pg` y **SQL plano (sin ORM)**. Siempre consultas parametrizadas (`$1, $2, ...`).
- **Migraciones**: archivos `.sql` numerados e **idempotentes** en `backend/migrations/` (`001_init.sql`, `002_seed_catalogs.sql`, ...), aplicados automáticamente al iniciar el servidor y registrados en la tabla `schema_migrations`.
- **IDs**: UUID v4 **generados por la aplicación** (`crypto.randomUUID()` de Node) y guardados en columnas de tipo nativo `UUID`. No se usa `gen_random_uuid()` (requiere `pgcrypto`, que puede no estar disponible en hosting compartido).
- Los campos de sincronización (`synced_at`, `version`, `device_id`, `conflict_status`) se **conservan como reservados** para una futura sincronización offline (ver backlog en `DEVELOPMENT_PLAN.md`). `version` también se usa para bloqueo optimista.

### Restricciones de compatibilidad con PostgreSQL 10

No usar funcionalidades de PG11+:
- ❌ Columnas generadas (`GENERATED ALWAYS AS ... STORED`) → calcular en la aplicación o en vistas.
- ❌ `CREATE PROCEDURE` / `CALL` → usar `CREATE FUNCTION` si fuese necesario.
- ❌ `MERGE` (PG15) → usar `INSERT ... ON CONFLICT ... DO UPDATE` (disponible desde PG 9.5).
- ❌ `EXECUTE FUNCTION` en triggers (PG11) → en PG10 se escribe `EXECUTE PROCEDURE`.
- ❌ `CREATE OR REPLACE TRIGGER` (PG14) → `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`.
- ❌ `gen_random_uuid()` sin `pgcrypto` → UUID generado en la app.
- ✅ Disponibles en PG10: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `JSONB`, `ON CONFLICT`, `UUID`, `TIMESTAMPTZ`, `CHECK`.
- Se prefieren `CHECK (col IN (...))` sobre tipos `ENUM` (en PG10 `ALTER TYPE ... ADD VALUE` no puede ejecutarse dentro de una transacción, lo que complica las migraciones).

## 📊 Diagrama de Relaciones

```
app_user (1) ──── (1) pilot
   │
   ├──── (∞) aircraft
   ├──── (∞) checklist_template (propios)
   └──── (1) user_preferences

pilot (1) ──── (∞) pilot_logbook
  │
  └─── (∞) pilot_licenses

aircraft_manufacturer (1) ──── (∞) aircraft_model
                                      │
                                      └──── (∞) aircraft
                                              │
                                              ├──── (∞) aircraft_logbook
                                              └──── (∞) flight_log

pilot (1) ──── (∞) flight_log ──── (1) aircraft
```

> **Nota (nuevo stack, v2 SaaS)**: `app_user` es multiusuario con login social (Google/Facebook) y sesión JWT en cookie httpOnly revocable (`user_session`). Los catálogos `aircraft_manufacturer` y `aircraft_model` son compartidos (sin `user_id`). Las demás tablas pertenecen a un usuario directamente (`user_id`) o a través de su padre (`pilot`, `aircraft`).

### Orden de creación en migraciones

Las claves foráneas exigen crear las tablas en este orden (distinto al orden de lectura del documento). Las tablas SaaS v2 (identidad, billing, normativa, educación, evaluación) se crean después; ver "Orden de creación (v2)":

1. `schema_migrations` → 2. `app_user` → 3. `pilot` → 4. `pilot_licenses` → 5. `aircraft_manufacturer` → 6. `aircraft_model` → 7. `aircraft` → 8. `aircraft_logbook` → 9. `flight_log` → 10. `pilot_logbook` → 11. `checklist_template` → 12. `user_preferences`

## 🗂️ Tablas de Infraestructura

### 0a. `schema_migrations` - Control de Migraciones

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,                   -- Nombre del archivo: '001_init.sql'
  checksum    TEXT NOT NULL,                      -- SHA-256 del archivo aplicado
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 0b. `app_user` - Usuario de la Aplicación (multiusuario, login social)

> **v2 (SaaS)**: registro público con Google/Facebook (OAuth 2.0 / OIDC). **Sin contraseñas locales** (no hay `password_hash`). Roles `student` (por defecto) y `admin`. Ver `oauth_identity` y `user_session` más abajo.

```sql
CREATE TABLE IF NOT EXISTS app_user (
  id             UUID PRIMARY KEY,                -- Generado por la app
  email          TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  display_name   TEXT,
  avatar_url     TEXT,                            -- Minimización: solo nombre, email y avatar del proveedor
  role           TEXT NOT NULL DEFAULT 'student'
                 CHECK (role IN ('student', 'admin')),
  status         TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'suspended', 'deleted')),
  last_login_at  TIMESTAMPTZ,
  deleted_at     TIMESTAMPTZ,                     -- Eliminación de cuenta (datos anonimizados)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_app_user_email ON app_user (LOWER(email));
```

## 🗂️ Tablas Principales

### 1. `pilot` - Datos del Piloto
Información personal del piloto. Un registro de piloto por usuario.

```sql
CREATE TABLE IF NOT EXISTS pilot (
  -- Identificador único (UUID generado por la app)
  id UUID PRIMARY KEY,                     -- "550e8400-e29b-41d4-a716-446655440000"
  user_id UUID NOT NULL UNIQUE REFERENCES app_user(id) ON DELETE CASCADE,

  -- Datos del piloto
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  license_number TEXT NOT NULL,
  license_type TEXT NOT NULL,              -- PPL, CPL, ATPL, etc.
  license_issue_date DATE NOT NULL,
  license_expiry_date DATE NOT NULL,
  medical_class TEXT,                      -- Clase I, II, III
  medical_expiry_date DATE,
  email TEXT,
  phone TEXT,
  address TEXT,
  photo_path TEXT,                         -- Ruta del archivo subido (servidor)
  total_hours NUMERIC(10,2) NOT NULL DEFAULT 0,  -- Horas totales acumuladas
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- 🔄 Campos de auditoría / sincronización (reservados)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,                   -- Reservado: sincronización offline futura
  version INTEGER NOT NULL DEFAULT 1,      -- Bloqueo optimista / conflictos
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  device_id TEXT,                          -- Reservado
  conflict_status TEXT NOT NULL DEFAULT 'none'
    CHECK (conflict_status IN ('none', 'pending', 'resolved')),

  UNIQUE (user_id, license_number)
);
```

**Campos clave**:
- `license_expiry_date`: Usado para alertas de vencimiento
- `medical_expiry_date`: Alerta de vencimiento de certificado médico
- `total_hours`: Calculado automáticamente desde flight_log (en la capa de servicio)
- `is_active`: Solo un piloto activo por usuario

---

### 2. `pilot_licenses` - Licencias y Certificaciones
Gestión de múltiples licencias, ratings y endorsements del piloto.

```sql
CREATE TABLE IF NOT EXISTS pilot_licenses (
  -- Identificador único (UUID)
  id UUID PRIMARY KEY,
  pilot_id UUID NOT NULL REFERENCES pilot(id) ON DELETE CASCADE,

  -- Datos de la licencia
  license_type TEXT NOT NULL,              -- IR, ME, SEL, etc.
  license_number TEXT,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  issuing_authority TEXT,                  -- FAA, EASA, etc.
  notes TEXT,
  document_path TEXT,                      -- Ruta a documento escaneado (servidor)

  -- 🔄 Campos de auditoría / sincronización (reservados)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  device_id TEXT,
  conflict_status TEXT NOT NULL DEFAULT 'none'
    CHECK (conflict_status IN ('none', 'pending', 'resolved'))
);
```

**Propósito**: Mantener todas las certificaciones adicionales (IFR, Multi-engine, etc.)

---

### 3. `pilot_logbook` - Bitácora Personal del Piloto
Registro detallado de horas de vuelo por categoría.

```sql
-- Crear DESPUÉS de aircraft y flight_log (ver "Orden de creación")
CREATE TABLE IF NOT EXISTS pilot_logbook (
  -- Identificador único (UUID)
  id UUID PRIMARY KEY,
  pilot_id UUID NOT NULL REFERENCES pilot(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  aircraft_id UUID REFERENCES aircraft(id) ON DELETE SET NULL,  -- NULL si aeronave no registrada
  aircraft_type TEXT NOT NULL,             -- SEL, MEL, Jet, Heli, etc.
  registration TEXT,                       -- Matrícula de la aeronave

  -- Horas de vuelo
  total_time NUMERIC(6,2) NOT NULL,        -- Tiempo total del vuelo
  pic_time NUMERIC(6,2) NOT NULL DEFAULT 0,        -- Pilot in Command
  sic_time NUMERIC(6,2) NOT NULL DEFAULT 0,        -- Second in Command
  dual_time NUMERIC(6,2) NOT NULL DEFAULT 0,       -- Instrucción dual
  instructor_time NUMERIC(6,2) NOT NULL DEFAULT 0, -- Como instructor

  -- Condiciones
  day_time NUMERIC(6,2) NOT NULL DEFAULT 0,
  night_time NUMERIC(6,2) NOT NULL DEFAULT 0,
  ifr_actual NUMERIC(6,2) NOT NULL DEFAULT 0,
  ifr_simulated NUMERIC(6,2) NOT NULL DEFAULT 0,
  cross_country NUMERIC(6,2) NOT NULL DEFAULT 0,

  -- Operaciones
  landings_day INTEGER NOT NULL DEFAULT 0,
  landings_night INTEGER NOT NULL DEFAULT 0,
  approaches INTEGER NOT NULL DEFAULT 0,

  -- Ruta
  departure_airport TEXT,                  -- ICAO code (ej: SVMI)
  departure_runway TEXT,                   -- Pista de salida (ej: 10L)
  arrival_airport TEXT,                    -- ICAO code (ej: SVMG)
  arrival_runway TEXT,                     -- Pista de llegada

  -- Procedimientos IFR
  sid TEXT,                                -- Standard Instrument Departure (ej: OSMAR2)
  star TEXT,                               -- Standard Terminal Arrival (ej: SVMT/D299J)
  approach_type TEXT,                      -- ILS, RNAV, VOR, etc.

  -- Ruta completa
  route TEXT,                              -- Ruta completa formato ICAO
                                           -- Ej: SVMI/10L N0176F230 OSMAR2 OSMAR W20 CBC G443 PARDU SVMT/D299J.D06 SVMG

  notes TEXT,
  flight_log_id UUID REFERENCES flight_log(id) ON DELETE SET NULL,  -- Referencia a flight_log si existe

  -- 🔄 Campos de auditoría / sincronización (reservados)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  device_id TEXT,
  conflict_status TEXT NOT NULL DEFAULT 'none'
    CHECK (conflict_status IN ('none', 'pending', 'resolved'))
);
```

**Propósito**: Cumplir con requisitos de bitácora de piloto para regulaciones (FAA, EASA, etc.)

---

### 4. `aircraft_manufacturer` - Fabricantes de Aeronaves
Catálogo de fabricantes para normalización (compartido entre usuarios).

```sql
CREATE TABLE IF NOT EXISTS aircraft_manufacturer (
  -- Identificador único (UUID)
  id UUID PRIMARY KEY,

  -- Datos del fabricante
  name TEXT NOT NULL UNIQUE,               -- Cessna, Piper, Beechcraft, etc.
  country TEXT,
  website TEXT,

  -- 🔄 Campos de auditoría / sincronización (reservados)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  device_id TEXT,
  conflict_status TEXT NOT NULL DEFAULT 'none'
    CHECK (conflict_status IN ('none', 'pending', 'resolved'))
);
```

**Datos precargados**: Cessna, Piper, Beechcraft, Cirrus, Diamond, etc. (seed idempotente con `INSERT ... ON CONFLICT (name) DO NOTHING`).

---

### 5. `aircraft_model` - Modelos de Aeronaves
Catálogo de modelos con parámetros base (compartido entre usuarios).

```sql
CREATE TABLE IF NOT EXISTS aircraft_model (
  -- Identificador único (UUID)
  id UUID PRIMARY KEY,
  manufacturer_id UUID NOT NULL REFERENCES aircraft_manufacturer(id),
  model_name TEXT NOT NULL,                -- C172, PA-28, etc.
  model_variant TEXT,                      -- Skyhawk, Warrior, etc.

  -- Clasificación
  aircraft_category TEXT NOT NULL,         -- Airplane, Helicopter, Glider
  aircraft_class TEXT NOT NULL,            -- SEL, MEL, SES, MES
  engine_type TEXT NOT NULL,               -- Piston, Turboprop, Jet
  engine_count INTEGER NOT NULL,

  -- Parámetros de performance base (pueden ser override por aircraft)
  max_speed_kts REAL,                      -- Velocidad máxima en nudos
  cruise_speed_kts REAL,                   -- Velocidad de crucero
  stall_speed_kts REAL,                    -- Velocidad de pérdida
  max_range_nm REAL,                       -- Alcance máximo en millas náuticas
  service_ceiling_ft REAL,                 -- Techo de servicio en pies
  rate_of_climb_fpm REAL,                  -- Razón de ascenso ft/min

  -- Capacidades
  fuel_capacity_total REAL,                -- Capacidad total de combustible
  fuel_capacity_usable REAL,               -- Combustible usable
  fuel_type TEXT,                          -- 100LL, Jet-A, etc.
  fuel_consumption_gph REAL,               -- Consumo en galones por hora

  -- Pesos
  max_takeoff_weight REAL,                 -- Peso máximo de despegue
  empty_weight REAL,                       -- Peso vacío
  useful_load REAL,                        -- Carga útil

  -- 🔄 Campos de auditoría / sincronización (reservados)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  device_id TEXT,
  conflict_status TEXT NOT NULL DEFAULT 'none'
    CHECK (conflict_status IN ('none', 'pending', 'resolved')),

  UNIQUE (manufacturer_id, model_name, model_variant)
);
```

**Propósito**: Base de datos de referencia para facilitar configuración de aeronaves

---

### 6. `aircraft` - Aeronaves del Usuario
Aeronaves específicas que el piloto vuela (propias o arrendadas).

```sql
CREATE TABLE IF NOT EXISTS aircraft (
  -- Identificador único (UUID)
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES aircraft_model(id),

  -- Identificación
  registration TEXT NOT NULL,              -- N12345, XA-ABC, etc.
  serial_number TEXT,
  year_manufactured INTEGER,

  -- Estado
  ownership_type TEXT NOT NULL
    CHECK (ownership_type IN ('owned', 'rented', 'club', 'flight_school')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'maintenance', 'inactive')),

  -- Parámetros específicos (override de model si necesario)
  cruise_speed_kts REAL,
  fuel_capacity_usable REAL,
  fuel_consumption_gph REAL,
  empty_weight REAL,
  useful_load REAL,

  -- Performance personalizada
  performance_params JSONB,                -- JSON con parámetros adicionales

  -- Hobbs/Tach
  hobbs_time NUMERIC(10,2) NOT NULL DEFAULT 0,   -- Horas Hobbs actuales
  tach_time NUMERIC(10,2) NOT NULL DEFAULT 0,    -- Horas Tach actuales

  -- Documentos
  insurance_expiry DATE,
  registration_expiry DATE,
  airworthiness_expiry DATE,

  notes TEXT,
  photo_path TEXT,                         -- Ruta a foto del avión (servidor)

  -- 🔄 Campos de auditoría / sincronización (reservados)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  device_id TEXT,
  conflict_status TEXT NOT NULL DEFAULT 'none'
    CHECK (conflict_status IN ('none', 'pending', 'resolved')),

  UNIQUE (user_id, registration)
);
```

**Campos clave**:
- `ownership_type`: Permite identificar si es propio o arrendado
- `hobbs_time` / `tach_time`: Para seguimiento de mantenimiento
- `performance_params`: JSONB flexible para parámetros adicionales

---

### 7. `aircraft_logbook` - Bitácora de la Aeronave
Registro de mantenimiento y estado de la aeronave.

```sql
CREATE TABLE IF NOT EXISTS aircraft_logbook (
  -- Identificador único (UUID)
  id UUID PRIMARY KEY,
  aircraft_id UUID NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,

  -- Tipo de entrada
  entry_type TEXT NOT NULL
    CHECK (entry_type IN ('maintenance', 'inspection', 'repair', 'modification')),

  -- Datos de la entrada
  date DATE NOT NULL,
  hobbs_at_service NUMERIC(10,2),
  tach_at_service NUMERIC(10,2),

  -- Descripción
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  work_performed TEXT,
  parts_replaced TEXT,

  -- Responsable
  performed_by TEXT,                       -- Nombre del mecánico/taller
  license_number TEXT,                     -- A&P license

  -- Próximo servicio
  next_service_hours NUMERIC(10,2),        -- Horas para próximo servicio
  next_service_date DATE,                  -- Fecha de próximo servicio

  -- Documentos
  document_path TEXT,                      -- Ruta a PDF/imagen del trabajo (servidor)
  cost NUMERIC(12,2),

  -- 🔄 Campos de auditoría / sincronización (reservados)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  device_id TEXT,
  conflict_status TEXT NOT NULL DEFAULT 'none'
    CHECK (conflict_status IN ('none', 'pending', 'resolved'))
);
```

**Propósito**: Mantener historial de mantenimiento para cumplir regulaciones

---

### 8. `flight_log` - Registro de Vuelos
Log detallado de cada vuelo realizado.

```sql
CREATE TABLE IF NOT EXISTS flight_log (
  -- Identificador único (UUID)
  id UUID PRIMARY KEY,
  pilot_id UUID NOT NULL REFERENCES pilot(id) ON DELETE CASCADE,
  aircraft_id UUID NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,

  -- Fecha y hora
  flight_date DATE NOT NULL,
  departure_time TIME,                     -- HH:MM (local)
  arrival_time TIME,                       -- HH:MM (local)

  -- Ruta
  departure_airport TEXT NOT NULL,         -- ICAO code (ej: SVMI)
  departure_runway TEXT,                   -- Pista de salida (ej: 10L)
  arrival_airport TEXT NOT NULL,           -- ICAO code (ej: SVMG)
  arrival_runway TEXT,                     -- Pista de llegada

  -- Procedimientos IFR
  sid TEXT,                                -- Standard Instrument Departure (ej: OSMAR2)
  star TEXT,                               -- Standard Terminal Arrival (ej: SVMT/D299J)
  approach_type TEXT,                      -- ILS, RNAV, VOR, etc.
  approach_procedure TEXT,                 -- Procedimiento completo (ej: D06)

  -- Ruta completa
  route TEXT,                              -- Ruta completa formato ICAO
                                           -- Ej: SVMI/10L N0176F230 OSMAR2 OSMAR W20 CBC G443 PARDU SVMT/D299J.D06 SVMG
  waypoints TEXT,                          -- Waypoints separados (ej: OSMAR, CBC, PARDU)
  airways TEXT,                            -- Aerovías (ej: W20, G443)

  -- Velocidad y altitud planificadas
  cruise_speed_kts REAL,                   -- Velocidad de crucero planificada
  cruise_altitude_ft REAL,                 -- Altitud de crucero planificada

  -- Tiempos
  hobbs_start NUMERIC(10,2),
  hobbs_end NUMERIC(10,2),
  tach_start NUMERIC(10,2),
  tach_end NUMERIC(10,2),
  flight_time NUMERIC(6,2) NOT NULL,       -- Tiempo total del vuelo

  -- Combustible
  fuel_start REAL,                         -- Combustible inicial
  fuel_added REAL NOT NULL DEFAULT 0,      -- Combustible agregado
  fuel_end REAL,                           -- Combustible final
  fuel_used REAL,                          -- Combustible usado

  -- Condiciones
  weather_conditions TEXT,                 -- VFR, IFR, VMC, IMC
  flight_type TEXT,                        -- training, personal, business

  -- Pasajeros
  passengers INTEGER NOT NULL DEFAULT 0,

  -- Cálculos del vuelo (JSON)
  flight_plan JSONB,                       -- JSON con plan de vuelo completo
  calculations JSONB,                      -- JSON con cálculos realizados

  -- Notas
  notes TEXT,
  issues TEXT,                             -- Problemas encontrados

  -- 🔄 Campos de auditoría / sincronización (reservados)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  device_id TEXT,
  conflict_status TEXT NOT NULL DEFAULT 'none'
    CHECK (conflict_status IN ('none', 'pending', 'resolved'))
);
```

**Campos clave**:
- `flight_plan`: JSON con plan completo (permite guardar cálculos pre-vuelo)
- `calculations`: Cálculos realizados durante la planificación
- `route`: Ruta completa en formato ICAO estándar
- Actualiza automáticamente `hobbs_time` y `tach_time` en `aircraft` (capa de servicio, misma transacción)

**Formato de Ruta ICAO**:

El campo `route` almacena la ruta completa del plan de vuelo en formato ICAO estándar.

**Ejemplo completo**:
```
SVMI/10L N0176F230 OSMAR2 OSMAR W20 CBC G443 PARDU SVMT/D299J.D06 SVMG
```

**Componentes desglosados**:

| Componente | Descripción | Ejemplo |
|------------|-------------|---------|
| `SVMI` | Aeropuerto de salida (ICAO) | SVMI (Maiquetía, Venezuela) |
| `/10L` | Pista de salida | 10L (Runway 10 Left) |
| `N0176F230` | Velocidad y altitud | N=Nudos, 0176=176kts, F=Flight Level, 230=FL230 |
| `OSMAR2` | SID (Salida Instrumental) | OSMAR TWO departure |
| `OSMAR` | Primer waypoint del SID | Waypoint OSMAR |
| `W20` | Aerovía | Airway W20 |
| `CBC` | Waypoint en ruta | Waypoint CBC |
| `G443` | Aerovía | Airway G443 |
| `PARDU` | Waypoint de llegada | Waypoint PARDU |
| `SVMT/D299J` | STAR (Llegada Instrumental) | SVMT transition, D299J arrival |
| `.D06` | Procedimiento de aproximación | Approach D06 |
| `SVMG` | Aeropuerto de llegada (ICAO) | SVMG (Maracaibo, Venezuela) |

**Campos relacionados**:
- `departure_runway`: `10L`
- `arrival_runway`: Extraído de approach o manual
- `sid`: `OSMAR2`
- `star`: `SVMT/D299J`
- `approach_procedure`: `D06`
- `approach_type`: `ILS`, `RNAV`, `VOR`, etc.
- `waypoints`: `OSMAR, CBC, PARDU` (separados por comas)
- `airways`: `W20, G443` (separados por comas)
- `cruise_speed_kts`: `176`
- `cruise_altitude_ft`: `23000` (FL230 = 23,000 pies)

**Beneficios del almacenamiento detallado**:
1. **Análisis histórico**: Ver rutas más voladas
2. **Estadísticas**: Aeropuertos más visitados, procedimientos más usados
3. **Exportación**: Plan de vuelo completo para autoridades
4. **Búsqueda**: Encontrar vuelos por ruta, waypoint o aeropuerto
5. **Cumplimiento**: Registro completo para regulaciones

---

### 9. `checklist_template` - Plantillas de Checklist
Checklists personalizables por tipo de aeronave o fase de vuelo.

```sql
CREATE TABLE IF NOT EXISTS checklist_template (
  -- Identificador único (UUID)
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES app_user(id) ON DELETE CASCADE,  -- NULL = checklist del sistema (seed)
  name TEXT NOT NULL,
  aircraft_model_id UUID REFERENCES aircraft_model(id) ON DELETE CASCADE,  -- NULL = genérico
  phase TEXT NOT NULL
    CHECK (phase IN ('preflight', 'engine_start', 'taxi', 'takeoff', 'cruise', 'landing', 'shutdown', 'emergency')),
  checklist_items JSONB NOT NULL,          -- JSON array de items
  is_default BOOLEAN NOT NULL DEFAULT FALSE,

  -- 🔄 Campos de auditoría / sincronización (reservados)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  device_id TEXT,
  conflict_status TEXT NOT NULL DEFAULT 'none'
    CHECK (conflict_status IN ('none', 'pending', 'resolved'))
);
```

**Estructura JSON de checklist_items**:
```json
[
  {
    "order": 1,
    "item": "Fuel Selector",
    "action": "BOTH",
    "critical": true
  },
  {
    "order": 2,
    "item": "Mixture",
    "action": "RICH",
    "critical": true
  }
]
```

---

### 10. `user_preferences` - Preferencias del Usuario
Configuración global de la aplicación (una fila por usuario).

```sql
CREATE TABLE IF NOT EXISTS user_preferences (
  -- Identificador único (UUID)
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES app_user(id) ON DELETE CASCADE,

  -- Unidades preferidas
  speed_unit TEXT NOT NULL DEFAULT 'kts',        -- kts, km/h, mph, m/s, ft/s
  distance_unit TEXT NOT NULL DEFAULT 'nm',      -- m, km, ft, sm, nm
  altitude_unit TEXT NOT NULL DEFAULT 'ft',      -- m, ft
  fuel_unit TEXT NOT NULL DEFAULT 'USG',         -- L, USG, GAL, Qt, lQt
  weight_unit TEXT NOT NULL DEFAULT 'lb',        -- g, kg, t, lb, oz
  temperature_unit TEXT NOT NULL DEFAULT 'C',    -- C, F, K
  pressure_unit TEXT NOT NULL DEFAULT 'inHg',    -- hPa, inHg, bar
  show_dual_units BOOLEAN NOT NULL DEFAULT FALSE, -- mostrar doble unidad (ej: "150 kts / 278 km/h")

  -- Configuración de idioma
  language TEXT NOT NULL DEFAULT 'es'
    CHECK (language IN ('en', 'es', 'pt')),

  -- Notificaciones
  license_alert_days INTEGER NOT NULL DEFAULT 30,   -- Días antes de vencimiento para alertar
  medical_alert_days INTEGER NOT NULL DEFAULT 60,
  maintenance_alert_hours NUMERIC(6,2) NOT NULL DEFAULT 5.0,

  -- Tema y apariencia
  theme_mode TEXT NOT NULL DEFAULT 'light'
    CHECK (theme_mode IN ('light', 'dark', 'auto')),  -- auto = sigue sistema/navegador

  -- Tipografía (sigue configuración del navegador/OS por defecto)
  font_scale REAL NOT NULL DEFAULT 1.0,            -- Factor de escala adicional (0.85 - 2.0)
  use_system_font_size BOOLEAN NOT NULL DEFAULT TRUE,

  -- Accesibilidad
  high_contrast BOOLEAN NOT NULL DEFAULT FALSE,     -- modo alto contraste (prefers-contrast)
  reduce_motion BOOLEAN NOT NULL DEFAULT FALSE,     -- reducir animaciones (prefers-reduced-motion)
  use_system_accessibility BOOLEAN NOT NULL DEFAULT TRUE,

  -- Densidad de información
  information_density TEXT NOT NULL DEFAULT 'comfortable'
    CHECK (information_density IN ('compact', 'comfortable', 'spacious')),

  -- Otros ajustes visuales
  show_units_always BOOLEAN NOT NULL DEFAULT TRUE,
  flight_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE, -- modo de lectura en vuelo (alto contraste + texto grande)

  -- 🔄 Gestión de módulos
  enabled_modules JSONB,                   -- JSON array: ["aircraft", "logbook", "flight_planning", "tools", "maintenance", "reports"]

  -- 🔄 Configuración de sincronización (reservado, backlog)
  sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  sync_frequency TEXT NOT NULL DEFAULT 'every30min', -- manual, onOpen, every15min, every30min, every1hour
  auto_sync_wifi_only BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,

  -- 🔄 Campos de auditoría / sincronización (reservados)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  device_id TEXT,
  conflict_status TEXT NOT NULL DEFAULT 'none'
    CHECK (conflict_status IN ('none', 'pending', 'resolved'))
);
```

**Notas importantes**:
- `theme_mode = 'auto'`: Sigue `prefers-color-scheme` del navegador/OS
- `use_system_font_size = TRUE`: Respeta el tamaño de fuente del navegador
- `use_system_accessibility = TRUE`: Respeta `prefers-contrast` y `prefers-reduced-motion`
- `flight_mode_enabled`: Modo especial para uso en cabina con luz solar

---

## 🧩 Tablas SaaS (v2): Identidad, Seguridad, Billing, Normativa, Educación y Evaluación

> Todas las sentencias son compatibles con PostgreSQL 10.23 e idempotentes. Los UUID se generan en la app. Los montos se guardan como enteros en unidades mínimas (CLP no tiene decimales). **No existe ninguna columna para datos de tarjeta ni contraseñas.**

### Identidad y seguridad

```sql
-- Proveedores OAuth vinculados (Google, Facebook). Sin contraseñas locales.
CREATE TABLE IF NOT EXISTS oauth_identity (
  id                UUID PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL CHECK (provider IN ('google', 'facebook')),
  provider_subject  TEXT NOT NULL,                 -- 'sub' de Google / id de Facebook
  email             TEXT,
  email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at      TIMESTAMPTZ,
  UNIQUE (provider, provider_subject)
);
CREATE INDEX IF NOT EXISTS idx_oauth_identity_user ON oauth_identity(user_id);

-- Sesiones (jti del JWT en cookie httpOnly) para poder revocar
CREATE TABLE IF NOT EXISTS user_session (
  jti          UUID PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  user_agent   TEXT,
  ip_hash      TEXT                                -- hash, nunca la IP en claro
);
CREATE INDEX IF NOT EXISTS idx_user_session_user ON user_session(user_id);

-- Bitácora de auditoría de acciones sensibles (sin payloads sensibles)
CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL PRIMARY KEY,
  actor_id     UUID REFERENCES app_user(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,                      -- 'auth.login', 'role.change', 'account.delete', 'billing.status', 'content.publish', ...
  target_type  TEXT,
  target_id    TEXT,
  ip_hash      TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id, created_at);

-- Archivos subidos (checklists, recursos de lecciones, escaneos, fotos). Fuera del web root.
CREATE TABLE IF NOT EXISTS stored_file (
  id             UUID PRIMARY KEY,
  owner_user_id  UUID REFERENCES app_user(id) ON DELETE CASCADE,   -- NULL = contenido de la plataforma
  purpose        TEXT NOT NULL CHECK (purpose IN ('checklist', 'lesson_asset', 'question_image', 'license_scan', 'aircraft_photo', 'maintenance_doc', 'avatar')),
  original_name  TEXT NOT NULL,
  mime_type      TEXT NOT NULL CHECK (mime_type IN ('application/pdf', 'image/png', 'image/jpeg', 'image/webp')),
  size_bytes     INTEGER NOT NULL CHECK (size_bytes > 0),
  storage_key    TEXT NOT NULL UNIQUE,             -- nombre aleatorio en disco
  sha256         TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted     BOOLEAN NOT NULL DEFAULT FALSE
);

-- Aceptación versionada de Términos / Privacidad y consentimientos (Ley 19.628 / 21.719)
CREATE TABLE IF NOT EXISTS legal_acceptance (
  id            UUID PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  document      TEXT NOT NULL CHECK (document IN ('terms', 'privacy', 'consent_marketing', 'consent_analytics')),
  version       TEXT NOT NULL,
  granted       BOOLEAN NOT NULL DEFAULT TRUE,    -- FALSE = retiro del consentimiento
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_legal_acceptance_user ON legal_acceptance(user_id, document);

-- Solicitudes de derechos de titulares (acceso, rectificación, supresión, oposición, portabilidad)
CREATE TABLE IF NOT EXISTS data_request (
  id            UUID PRIMARY KEY,
  user_id       UUID REFERENCES app_user(id) ON DELETE SET NULL,
  request_type  TEXT NOT NULL CHECK (request_type IN ('access', 'rectification', 'deletion', 'opposition', 'portability')),
  status        TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'in_progress', 'answered', 'rejected')),
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at        TIMESTAMPTZ,
  answered_at   TIMESTAMPTZ,
  notes         TEXT
);
```

### Billing (Mercado Pago, CLP, agnóstico de proveedor)

```sql
CREATE TABLE IF NOT EXISTS billing_plan (
  id              UUID PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,            -- 'monthly'
  name            TEXT NOT NULL,
  amount_minor    INTEGER NOT NULL CHECK (amount_minor >= 0),  -- 5000 (CLP sin decimales)
  currency        TEXT NOT NULL DEFAULT 'CLP',
  interval_unit   TEXT NOT NULL DEFAULT 'month' CHECK (interval_unit IN ('month', 'year')),
  trial_days      INTEGER,                         -- NULL = sin prueba gratis (decisión abierta)
  provider        TEXT NOT NULL DEFAULT 'mercadopago' CHECK (provider IN ('mercadopago', 'stripe', 'flow')),
  provider_plan_id TEXT,                           -- id del preapproval_plan en Mercado Pago
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_customer (
  id                    UUID PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  provider              TEXT NOT NULL CHECK (provider IN ('mercadopago', 'stripe', 'flow')),
  provider_customer_id  TEXT,                      -- payer id / email del proveedor
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS subscription (
  id                        UUID PRIMARY KEY,
  user_id                   UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  plan_id                   UUID NOT NULL REFERENCES billing_plan(id),
  provider                  TEXT NOT NULL CHECK (provider IN ('mercadopago', 'stripe', 'flow')),
  provider_subscription_id  TEXT NOT NULL,         -- id del preapproval
  status                    TEXT NOT NULL CHECK (status IN ('incomplete', 'trialing', 'active', 'past_due', 'canceled')),
  provider_status           TEXT,                  -- estado crudo (pending, authorized, paused, cancelled)
  trial_ends_at             TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  cancel_at_period_end      BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at               TIMESTAMPTZ,
  last_event_at             TIMESTAMPTZ,           -- para descartar eventos fuera de orden
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_subscription_id)
);
CREATE INDEX IF NOT EXISTS idx_subscription_user ON subscription(user_id);

-- Log de notificaciones/webhooks con idempotencia
CREATE TABLE IF NOT EXISTS billing_event (
  id                 BIGSERIAL PRIMARY KEY,
  provider           TEXT NOT NULL,
  provider_event_id  TEXT NOT NULL,                -- id de la notificación (o data.id + x-request-id)
  event_type         TEXT NOT NULL,
  payload            JSONB NOT NULL,               -- sin datos de tarjeta (el proveedor no los envía)
  received_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at       TIMESTAMPTZ,
  processing_error   TEXT,
  UNIQUE (provider, provider_event_id)
);
-- Inserción idempotente: INSERT ... ON CONFLICT (provider, provider_event_id) DO NOTHING
```

### Normativa (autoridad + referencia regulatoria)

```sql
CREATE TABLE IF NOT EXISTS authority (
  id        UUID PRIMARY KEY,
  code      TEXT NOT NULL UNIQUE,                  -- 'DGAC-CL' (futuro: 'DGAC-EC' RDAC, 'DGAC-BO' RAB, 'MTC-PE' RAP)
  country   TEXT NOT NULL,                         -- ISO 3166-1 alfa-2: 'CL'
  name      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regulation_reference (
  id              UUID PRIMARY KEY,
  authority_id    UUID NOT NULL REFERENCES authority(id),
  code            TEXT NOT NULL,                   -- 'DAN 61'
  section         TEXT,                            -- '61.105'
  title           TEXT,
  version         TEXT NOT NULL,                   -- edición/enmienda de la norma
  effective_date  DATE,
  status          TEXT NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'superseded')),
  superseded_by   UUID REFERENCES regulation_reference(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (authority_id, code, section, version)
);
-- Tablas de enlace (subject_regulation, lesson_regulation, question_regulation) definidas abajo.
```

### Educación

```sql
CREATE TABLE IF NOT EXISTS subject (
  id            UUID PRIMARY KEY,
  authority_id  UUID NOT NULL REFERENCES authority(id),
  code          TEXT NOT NULL,                     -- 'AIR_LAW', 'METEOROLOGY', ...
  name          TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (authority_id, code)
);

CREATE TABLE IF NOT EXISTS course_module (
  id          UUID PRIMARY KEY,
  subject_id  UUID NOT NULL REFERENCES subject(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_free     BOOLEAN NOT NULL DEFAULT FALSE,      -- módulo gratuito (gating)
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson (
  id                     UUID PRIMARY KEY,
  module_id              UUID NOT NULL REFERENCES course_module(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL,
  sort_order             INTEGER NOT NULL DEFAULT 0,
  status                 TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_revision_id  UUID,                     -- FK agregada tras crear lesson_revision
  review_required        BOOLEAN NOT NULL DEFAULT FALSE,  -- marcado por cambio normativo
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted             BOOLEAN NOT NULL DEFAULT FALSE
);

-- Versionado inmutable de lecciones
CREATE TABLE IF NOT EXISTS lesson_revision (
  id           UUID PRIMARY KEY,
  lesson_id    UUID NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,
  revision_no  INTEGER NOT NULL,
  title        TEXT NOT NULL,
  body_html    TEXT NOT NULL,                      -- HTML sanitizado (sanitize-html)
  change_note  TEXT,
  author_id    UUID REFERENCES app_user(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_id, revision_no)
);

-- FK diferida por dependencia circular (idempotente en PG10 vía bloque DO)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lesson_published_revision') THEN
    ALTER TABLE lesson ADD CONSTRAINT fk_lesson_published_revision
      FOREIGN KEY (published_revision_id) REFERENCES lesson_revision(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS lesson_asset (
  id          UUID PRIMARY KEY,
  lesson_id   UUID NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,
  asset_type  TEXT NOT NULL CHECK (asset_type IN ('image', 'pdf', 'video_link')),
  file_id     UUID REFERENCES stored_file(id),     -- image/pdf
  url         TEXT,                                -- video_link (solo YouTube/Vimeo)
  caption     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  CHECK ((asset_type = 'video_link' AND url IS NOT NULL) OR (asset_type <> 'video_link' AND file_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id       UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  lesson_id     UUID NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,
  completed_at  TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS subject_regulation (
  subject_id     UUID NOT NULL REFERENCES subject(id) ON DELETE CASCADE,
  regulation_id  UUID NOT NULL REFERENCES regulation_reference(id),
  PRIMARY KEY (subject_id, regulation_id)
);
CREATE TABLE IF NOT EXISTS lesson_regulation (
  lesson_id      UUID NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,
  regulation_id  UUID NOT NULL REFERENCES regulation_reference(id),
  PRIMARY KEY (lesson_id, regulation_id)
);
```

### Evaluación

```sql
CREATE TABLE IF NOT EXISTS question (
  id                  UUID PRIMARY KEY,
  subject_id          UUID NOT NULL REFERENCES subject(id),
  module_id           UUID REFERENCES course_module(id) ON DELETE SET NULL,
  question_type       TEXT NOT NULL DEFAULT 'single_choice' CHECK (question_type IN ('single_choice')),
  difficulty          SMALLINT CHECK (difficulty BETWEEN 1 AND 5),
  weight              NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (weight > 0),   -- ponderación
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'retired')),
  current_revision_no INTEGER NOT NULL DEFAULT 1,
  review_required     BOOLEAN NOT NULL DEFAULT FALSE,
  external_ref        TEXT UNIQUE,                 -- clave para importación CSV/JSON idempotente
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Revisión inmutable: enunciado, opciones y explicación
CREATE TABLE IF NOT EXISTS question_revision (
  id            UUID PRIMARY KEY,
  question_id   UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  revision_no   INTEGER NOT NULL,
  stem_html     TEXT NOT NULL,
  image_file_id UUID REFERENCES stored_file(id),
  options       JSONB NOT NULL,                    -- [{"key":"A","text":"...","correct":false}, ...]
  explanation_html TEXT,
  author_id     UUID REFERENCES app_user(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, revision_no)
);

CREATE TABLE IF NOT EXISTS question_regulation (
  question_id    UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  regulation_id  UUID NOT NULL REFERENCES regulation_reference(id),
  PRIMARY KEY (question_id, regulation_id)
);

CREATE TABLE IF NOT EXISTS exam_template (
  id                UUID PRIMARY KEY,
  authority_id      UUID NOT NULL REFERENCES authority(id),
  code              TEXT NOT NULL UNIQUE,          -- 'PPL_MOCK_FULL', 'QUIZ_METEOROLOGY'
  name              TEXT NOT NULL,
  kind              TEXT NOT NULL CHECK (kind IN ('subject_quiz', 'mock_exam')),
  duration_minutes  INTEGER NOT NULL CHECK (duration_minutes > 0),
  pass_threshold    NUMERIC(5,2) NOT NULL CHECK (pass_threshold BETWEEN 0 AND 100),  -- % global
  is_free           BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_template_subject (
  template_id          UUID NOT NULL REFERENCES exam_template(id) ON DELETE CASCADE,
  subject_id           UUID NOT NULL REFERENCES subject(id),
  question_count       INTEGER NOT NULL CHECK (question_count > 0),
  subject_weight       NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (subject_weight > 0),
  min_subject_percent  NUMERIC(5,2),               -- mínimo por materia (opcional)
  PRIMARY KEY (template_id, subject_id)
);

CREATE TABLE IF NOT EXISTS exam_attempt (
  id             UUID PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  template_id    UUID NOT NULL REFERENCES exam_template(id),
  status         TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expired')),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deadline_at    TIMESTAMPTZ NOT NULL,             -- control de tiempo en servidor
  submitted_at   TIMESTAMPTZ,
  score_percent  NUMERIC(5,2),
  passed         BOOLEAN,
  subject_scores JSONB                             -- {"<subject_id>": {"percent": 80, "passed": true}}
);
-- Un intento activo por plantilla y usuario (índice parcial, PG10 OK)
CREATE UNIQUE INDEX IF NOT EXISTS ux_exam_attempt_active
  ON exam_attempt(user_id, template_id) WHERE status = 'in_progress';

CREATE TABLE IF NOT EXISTS exam_attempt_item (
  id               UUID PRIMARY KEY,
  attempt_id       UUID NOT NULL REFERENCES exam_attempt(id) ON DELETE CASCADE,
  question_id      UUID NOT NULL REFERENCES question(id),
  revision_no      INTEGER NOT NULL,               -- snapshot de la revisión usada
  position         INTEGER NOT NULL,
  option_order     JSONB NOT NULL,                 -- orden barajado de opciones
  chosen_key       TEXT,
  is_correct       BOOLEAN,
  weight           NUMERIC(6,2) NOT NULL,
  answered_at      TIMESTAMPTZ,
  UNIQUE (attempt_id, question_id)
);
```

### Cambios a tablas existentes

```sql
-- checklist_template: checklists subidos (PDF/imagen) o interactivos, ligados a una aeronave del usuario
ALTER TABLE checklist_template ADD COLUMN IF NOT EXISTS aircraft_id UUID REFERENCES aircraft(id) ON DELETE CASCADE;
ALTER TABLE checklist_template ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'interactive';
ALTER TABLE checklist_template ADD COLUMN IF NOT EXISTS document_file_id UUID REFERENCES stored_file(id);
-- En 001_init.sql se recomienda declarar directamente:
--   source_type TEXT NOT NULL DEFAULT 'interactive' CHECK (source_type IN ('interactive', 'document')),
--   CHECK (source_type = 'interactive' OR document_file_id IS NOT NULL)
-- y permitir checklist_items NULL cuando source_type = 'document'.
```

### Orden de creación (v2)

`schema_migrations` → `app_user` → `oauth_identity` → `user_session` → `audit_log` → `stored_file` → `legal_acceptance` → `data_request` → tablas de dominio (orden v1) → `billing_plan` → `billing_customer` → `subscription` → `billing_event` → `authority` → `regulation_reference` → `subject` → `course_module` → `lesson` → `lesson_revision` (+ FK diferida) → `lesson_asset` → `lesson_progress` → `subject_regulation` → `lesson_regulation` → `question` → `question_revision` → `question_regulation` → `exam_template` → `exam_template_subject` → `exam_attempt` → `exam_attempt_item`

### Flujo de revisión por cambio normativo

```sql
-- Al marcar una referencia como reemplazada, marcar el contenido afectado (dentro de una transacción)
UPDATE regulation_reference SET status = 'superseded', superseded_by = $2 WHERE id = $1;
UPDATE lesson   SET review_required = TRUE WHERE id IN (SELECT lesson_id   FROM lesson_regulation   WHERE regulation_id = $1);
UPDATE question SET review_required = TRUE WHERE id IN (SELECT question_id FROM question_regulation WHERE regulation_id = $1);
```

---

## 🔔 Sistema de Alertas

### Funcionalidades de Notificación

1. **Al iniciar sesión / abrir el dashboard**, el endpoint `GET /api/v1/alerts` verifica:
   - `pilot.license_expiry_date` vs fecha actual
   - `pilot.medical_expiry_date` vs fecha actual
   - `pilot_licenses.expiry_date` para cada licencia
   - `aircraft.insurance_expiry`, `registration_expiry`, `airworthiness_expiry`
   - Próximos mantenimientos basados en `hobbs_time` vs `next_service_hours`

2. **Mostrar modal** si:
   - Faltan menos de X días (configurado en `user_preferences`)
   - Ya venció algún documento

3. **Colores de alerta**:
   - 🟢 Verde: >30 días
   - 🟡 Amarillo: 15-30 días
   - 🟠 Naranja: 7-14 días
   - 🔴 Rojo: <7 días o vencido

---

## 📈 Cálculos Automáticos

### Lógica en la Capa de Servicio (no triggers)

**Decisión**: los cálculos automáticos se implementan en el **servicio Node.js**, dentro de una única transacción SQL (`BEGIN ... COMMIT` con un cliente del pool de `pg`), para mantener la lógica testeable y evitar dependencias de privilegios de funciones/triggers en el hosting compartido.

1. **Actualizar total_hours del piloto**:
   - Al insertar/actualizar/eliminar (soft delete) `flight_log`
   - Recalcular: `UPDATE pilot SET total_hours = (SELECT COALESCE(SUM(flight_time),0) FROM flight_log WHERE pilot_id = $1 AND is_deleted = FALSE) WHERE id = $1`

2. **Actualizar hobbs/tach de aeronave**:
   - Al insertar `flight_log`
   - `aircraft.hobbs_time = GREATEST(aircraft.hobbs_time, flight_log.hobbs_end)`
   - `aircraft.tach_time = GREATEST(aircraft.tach_time, flight_log.tach_end)`

3. **Crear entrada en pilot_logbook**:
   - Automáticamente al insertar `flight_log`
   - Copiar datos relevantes

> Si en algún momento se usan triggers, la sintaxis compatible con PG10 es:
> ```sql
> CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
> BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
> $$ LANGUAGE plpgsql;
>
> DROP TRIGGER IF EXISTS trg_pilot_updated_at ON pilot;
> CREATE TRIGGER trg_pilot_updated_at BEFORE UPDATE ON pilot
>   FOR EACH ROW EXECUTE PROCEDURE set_updated_at();   -- PG10: EXECUTE PROCEDURE
> ```

---

## 🚀 Optimización para Uso en Vuelo

### Índices Recomendados

```sql
-- Búsquedas frecuentes (idempotentes)
CREATE INDEX IF NOT EXISTS idx_flight_log_date ON flight_log(flight_date);
CREATE INDEX IF NOT EXISTS idx_flight_log_aircraft ON flight_log(aircraft_id);
CREATE INDEX IF NOT EXISTS idx_flight_log_pilot ON flight_log(pilot_id);
CREATE INDEX IF NOT EXISTS idx_pilot_logbook_date ON pilot_logbook(date);
CREATE INDEX IF NOT EXISTS idx_aircraft_user ON aircraft(user_id);
CREATE INDEX IF NOT EXISTS idx_aircraft_registration ON aircraft(registration);
CREATE INDEX IF NOT EXISTS idx_aircraft_status ON aircraft(status);
CREATE INDEX IF NOT EXISTS idx_aircraft_logbook_aircraft ON aircraft_logbook(aircraft_id);
```

### Consultas Pre-calculadas

Para acceso rápido durante vuelo (vistas `CREATE OR REPLACE VIEW`, compatibles con PG10):
- Vista de aeronaves activas con última fecha de mantenimiento
- Vista de totales de horas por categoría
- Vista de próximos vencimientos

---

## 📦 Datos Iniciales (Seed Data)

Migraciones de seed idempotentes (`INSERT ... ON CONFLICT DO NOTHING`):

### aircraft_manufacturer
- Cessna, Piper, Beechcraft, Cirrus, Diamond, Mooney, etc.

### aircraft_model
- Modelos comunes: C172, C182, PA-28, SR22, DA40, etc.

### checklist_template
- Checklists estándar para aeronaves comunes (`user_id = NULL`)

> Los UUID de las filas seed se escriben como literales fijos en el archivo `.sql` para que el seed sea determinista e idempotente.

---

## 🔄 Campos de Auditoría y Sincronización (reservados)

### Campos comunes

Todas las tablas de dominio incluyen **campos comunes**:

```sql
-- Campos presentes en TODAS las tablas de dominio
id UUID PRIMARY KEY,                                  -- UUID v4 generado por la app
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),        -- La app lo actualiza en cada UPDATE
synced_at TIMESTAMPTZ,                                -- Reservado (sync offline futura)
version INTEGER NOT NULL DEFAULT 1,                   -- Bloqueo optimista
is_deleted BOOLEAN NOT NULL DEFAULT FALSE,            -- Soft delete
device_id TEXT,                                       -- Reservado
conflict_status TEXT NOT NULL DEFAULT 'none'          -- Reservado
  CHECK (conflict_status IN ('none', 'pending', 'resolved'))
```

### Explicación de Campos

| Campo | Propósito | Valores |
|-------|-----------|---------|
| **id** | Identificador único global (UUID v4) | `'550e8400-e29b-41d4-a716-446655440000'` |
| **created_at** | Timestamp de creación (inmutable) | `2026-01-14 23:15:30.123+00` |
| **updated_at** | Timestamp de última modificación | `2026-01-14 23:20:45.789+00` |
| **synced_at** | Reservado: última sincronización offline | `NULL` |
| **version** | Contador incremental; bloqueo optimista (`WHERE id=$1 AND version=$2`) | `1`, `2`, `3`, etc. |
| **is_deleted** | Soft delete | `FALSE` (activo) o `TRUE` (eliminado) |
| **device_id** | Reservado: dispositivo origen | `NULL` |
| **conflict_status** | Reservado: estado de conflicto | `'none'`, `'pending'`, `'resolved'` |

### UUIDs generados por la aplicación

**Razón**: Los UUIDs evitan IDs secuenciales enumerables en la API y dejan la puerta abierta a crear registros offline en el futuro sin colisiones.

**Generación** (Node.js, sin dependencias nativas ni extensiones de PostgreSQL):
```js
const { randomUUID } = require('node:crypto');

const id = randomUUID(); // '550e8400-e29b-41d4-a716-446655440000'
await pool.query('INSERT INTO pilot (id, user_id, first_name, ...) VALUES ($1, $2, $3, ...)', [id, userId, firstName /* ... */]);
```

**Ventajas**:
- ✅ No requiere `pgcrypto` ni `uuid-ossp` (compatibilidad con hosting compartido)
- ✅ IDs no enumerables en las URLs de la API (importante en un SaaS multiusuario)
- ✅ Compatible con una futura sincronización offline
- ✅ No requiere secuencias centralizadas

### Soft Delete

**Concepto**: En lugar de `DELETE FROM tabla WHERE id = $1`, usar `UPDATE tabla SET is_deleted = TRUE, updated_at = NOW(), version = version + 1 WHERE id = $1`

**Razón**: Permite recuperar registros y mantener el historial regulatorio.

**Consultas**:
```sql
-- Obtener solo registros activos
SELECT * FROM pilot WHERE is_deleted = FALSE;

-- Purgar registros eliminados antiguos (limpieza periódica)
DELETE FROM pilot
WHERE is_deleted = TRUE
AND updated_at < NOW() - INTERVAL '90 days';
```

### Detección de Conflictos (bloqueo optimista)

**Escenario**:
1. Dos pestañas/dispositivos leen el mismo registro con `version = 5`
2. El primero guarda → `UPDATE ... SET version = 6 WHERE id = $1 AND version = 5` (1 fila afectada)
3. El segundo guarda con `version = 5` → 0 filas afectadas → la API responde `409 Conflict`

**Resolución**:
- **Recargar y reintentar** (por defecto)
- **Last Write Wins**: solo para tablas de bajo riesgo (ej. `user_preferences`)
- La sincronización offline completa (push/pull, `conflict_status`) queda en el backlog.

---

## 🌐 Base de Datos en Producción

### PostgreSQL 10.23 en hosting cPanel (supuesto a confirmar)

- Base de datos y usuario creados desde cPanel → "PostgreSQL Databases".
- Conexión vía variables de entorno (`dotenv`): `DATABASE_URL` o `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`.
- Runtime: Node.js 20 (cPanel 20.20.2) + Express 5.
- Las migraciones se aplican al iniciar la app Node (Passenger), en orden numérico y dentro de una transacción por archivo; cada archivo aplicado se registra en `schema_migrations`.
- Desarrollo local: `docker compose up` con `postgres:10` para reproducir exactamente la versión de producción.

**Tipos usados (PostgreSQL)**:

| Concepto | Tipo PostgreSQL |
|----------|-----------------|
| Identificadores | `UUID` (generado por la app) |
| Fechas | `DATE` |
| Horas locales | `TIME` |
| Timestamps | `TIMESTAMPTZ` (UTC) |
| Horas de vuelo / Hobbs / Tach / costos | `NUMERIC(p,2)` |
| Parámetros de performance | `REAL` |
| JSON | `JSONB` |
| Booleanos | `BOOLEAN` |
| Valores enumerados | `TEXT` + `CHECK (... IN (...))` |

---

**Última actualización**: 20 de octubre de 2026
**Versión**: 4.0.0 - SaaS multiusuario: identidad OAuth, billing Mercado Pago (CLP), normativa DGAC Chile, educación y evaluación (PostgreSQL 10.23)
