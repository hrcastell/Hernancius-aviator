# Notas de Arquitectura - Hernancius Aviation

## ⚠️ Decisiones de Diseño Importantes

### SaaS Multiusuario con Login Social, Roles y Suscripción (v2)

> **Cambio de alcance (oct 2026)**: de app personal offline (Flutter/SQLite) a **plataforma SaaS multiusuario para alumnos PPL** con React (Vite) + Node.js 20/Express 5 + PostgreSQL 10.23.

**Decisión**: Este proyecto incluye:
- **Registro público** con **Google y Facebook** (OAuth 2.0 / OIDC, `passport`). **Sin contraseñas locales**. Vinculación de cuentas solo por email verificado
- **Sesión**: JWT corto en cookie **httpOnly Secure SameSite=Lax**, `jti` en `user_session` para revocar; **token CSRF** en operaciones de escritura
- **Roles**: `student` (por defecto) y `admin` (contenidos, banco de preguntas, usuarios, suscripciones)
- **Suscripción mensual** (5.000 CLP) vía **Mercado Pago** (preapproval) + webhooks firmados; middleware de **entitlements** para funciones pagadas
- Datos aislados por usuario (`user_id`) y **auditoría** de acciones sensibles

**Normativa**: contenidos y exámenes según **DGAC Chile (DAN/DAR)**, etiquetados con `authority` + `regulation_reference` para revisar contenido cuando cambie una norma. FAA solo como referencia.

**Nota**: la regla HR_Permissions_EnforceRoleCheck **sí aplica** ahora (roles admin/student).

## Enfoque de la Aplicación

### Usuario Objetivo
- Pilotos individuales con aeronaves propias
- Pilotos que vuelan aeronaves arrendadas
- Uso personal sin compartir datos

### Características Principales

1. **Plataforma Web SaaS**
   - Educación (materias → módulos → lecciones) y evaluación (banco de preguntas, simulacros)
   - Suscripción con Mercado Pago; funciones gratuitas y pagadas
   - Frontend React (Vite) servido como SPA estática
   - API REST Node.js + Express 5
   - Almacenamiento en PostgreSQL 10.23 (SQL plano con `pg`, sin ORM)
   - Calculadoras y conversores funcionan en el navegador sin llamar al servidor
   - Modo offline (PWA) queda como idea en backlog

2. **Herramientas de Vuelo**
   - Cálculos de navegación
   - Conversión de unidades
   - Planificación de vuelos
   - Checklists personalizables

3. **Bitácora Personal**
   - Registro de horas de vuelo
   - Historial de vuelos realizados
   - Exportación a Excel

4. **Gestión de Aeronaves**
   - Parámetros de performance
   - Documentación técnica
   - Historial de mantenimiento

## Arquitectura Modular Independiente

### Diseño por Módulos Autónomos

**Concepto**: Cada módulo funcional es completamente independiente con su propia estructura interna (models, screens, widgets, services, utils). Esta arquitectura permite:

- ✅ **Feature toggles**: Habilitar/deshabilitar módulos desde configuración
- ✅ **Desarrollo aislado**: Cambios en un módulo no afectan otros
- ✅ **Code splitting** (Vite + `React.lazy`): Solo cargar código de módulos activos
- ✅ **Testing independiente**: Tests por módulo sin dependencias cruzadas
- ✅ **Escalabilidad**: Agregar nuevos módulos sin tocar código existente

### Estructura de Directorios

```
backend/
├── migrations/                    # SQL numerado e idempotente, aplicado al iniciar
│   ├── 001_init.sql
│   ├── 002_seed_catalogs.sql
│   └── ...
├── src/
│   ├── core/                      # Núcleo compartido (SIEMPRE activo)
│   │   ├── config/                # env.js (dotenv), cors.js (allowlist)
│   │   ├── db/                    # pool.js (pg), migrate.js, tx.js (transacciones)
│   │   ├── middleware/            # auth.js (JWT), errorHandler.js, validate.js
│   │   └── utils/                 # uuid.js (crypto.randomUUID), dates.js, validators.js
│   ├── modules/                   # Módulos independientes
│   │   ├── auth/                  # Google/Facebook OAuth, vinculación, me, logout
│   │   ├── billing/               # interfaz de proveedor + adaptador Mercado Pago, webhooks, entitlements
│   │   ├── education/             # materias, módulos, lecciones, versiones, progreso (+ admin)
│   │   ├── evaluation/            # banco de preguntas, plantillas, intentos, puntaje (+ admin)
│   │   ├── regulations/           # autoridad, referencias DAN/DAR, revisión por cambio normativo
│   │   ├── files/                 # servicio seguro de subida de archivos
│   │   ├── privacy/               # eliminación de cuenta, exportación, consentimientos, derechos
│   │   ├── aircraft/              # aircraft.routes.js / .controller.js / .service.js / .repository.js
│   │   ├── logbook/               # pilot, pilot_licenses, pilot_logbook
│   │   ├── flight_planning/       # flight_log + planes de vuelo
│   │   ├── maintenance/           # alertas y mantenimiento (usa aircraft_logbook)
│   │   ├── reports/               # estadísticas y exportaciones
│   │   ├── weather/               # proxy METAR/TAF (oculta API keys)
│   │   └── settings/              # user_preferences (SIEMPRE activo)
│   ├── app.js                     # Express app (helmet, cors, json, rutas)
│   └── server.js                  # Arranque: migraciones + listen (Passenger)
└── tests/

frontend/
├── src/
│   ├── core/                      # Núcleo compartido (SIEMPRE activo)
│   │   ├── api/                   # cliente HTTP con JWT
│   │   ├── auth/                  # AuthContext, ProtectedRoute, rutas por rol
│   │   ├── entitlements/          # useEntitlement (gating de funciones pagadas)
│   │   ├── theme/                 # ThemeProvider, tokens CSS
│   │   ├── i18n/                  # configuración + en.json, es.json, pt.json
│   │   ├── components/            # AppBar, Button, Card, Input, InfoModal, UtcClock
│   │   └── config/                # routes.jsx, moduleRegistry.js
│   ├── public/                    # landing, precios, páginas legales
│   ├── admin/                     # editor de contenido, banco de preguntas, usuarios, suscripciones
│   ├── modules/
│   │   ├── education/
│   │   ├── exams/
│   │   ├── billing/
│   │   ├── aircraft/              # pages/, components/, hooks/, api.js, index.js
│   │   ├── logbook/
│   │   ├── flight_planning/
│   │   ├── tools/                 # conversor, calculadoras (E6B, performance)
│   │   ├── weather/               # METAR/TAF
│   │   ├── maintenance/
│   │   ├── reports/
│   │   └── settings/              # SIEMPRE activo
│   └── main.jsx                   # Entry point
└── public/
```

### Sistema de Gestión de Módulos

#### Registro de Módulos (`frontend/src/core/config/moduleRegistry.js`)

Cada módulo se registra con sus metadatos:

```js
export const MODULES = [
  {
    id: 'aircraft',             // aircraft | logbook | flight_planning | tools | maintenance | reports | settings
    nameKey: 'modules.aircraft',
    icon: 'flight',
    isCore: false,              // settings: true (no se puede deshabilitar)
    dependsOn: [],
    load: () => import('../../modules/aircraft'),  // carga diferida
  },
  // ...
];
```

#### Contexto de Configuración (`frontend/src/core/config/ModuleConfigContext.jsx`)

Gestiona módulos activos (persistidos en `user_preferences.enabled_modules` vía API) y permite toggle desde configuración:

```js
const { isModuleEnabled, toggleModule, enabledModules } = useModuleConfig();
```

### Tabla de Módulos

| Módulo | ID | Descripción | Core | Tablas BD | Toggle |
|--------|-----|-------------|------|-----------|--------|
| **Aircraft** | `aircraft` | Gestión de aeronaves | No | 4 tablas | ✅ Sí |
| **Logbook** | `logbook` | Bitácora personal | No | 3 tablas | ✅ Sí |
| **Flight Planning** | `flight_planning` | Planificación de vuelos | No | 1 tabla | ✅ Sí |
| **Tools** | `tools` | Calculadoras y conversiones | No | 0 tablas | ✅ Sí |
| **Maintenance** | `maintenance` | Mantenimiento predictivo | No | 0 tablas* | ✅ Sí |
| **Reports** | `reports` | Reportes y exportaciones | No | 0 tablas | ✅ Sí |
| **Settings** | `settings` | Configuración general | **Sí** | 1 tabla | ❌ No |

*Usa tablas de otros módulos

### Dependencias entre Módulos

Algunos módulos requieren otros para funcionar:

- **Flight Planning** → requiere **Aircraft** + **Logbook**
- **Maintenance** → requiere **Aircraft**
- **Reports** → requiere **Logbook** + **Aircraft**

El sistema valida dependencias antes de deshabilitar un módulo.

### Base de Datos (PostgreSQL 10.23)

**10 Tablas Principales** de operación (+ tablas SaaS v2 de identidad, billing, normativa, educación y evaluación; ver `TABLES_SUMMARY.md`) - Diseño minimalista para acceso rápido en vuelo:

#### Piloto (3 tablas) - Módulo: Logbook
1. **pilot**: Datos personales, licencia, certificado médico, total de horas
2. **pilot_licenses**: Certificaciones adicionales (IFR, ME, etc.)
3. **pilot_logbook**: Bitácora personal detallada (cumple FAA/EASA)

#### Aeronaves (5 tablas) - Módulo: Aircraft
4. **aircraft_manufacturer**: Fabricantes (Cessna, Piper, etc.)
5. **aircraft_model**: Modelos con parámetros base (C172, PA-28, etc.)
6. **aircraft**: Aeronaves específicas del usuario (propias/arrendadas)
7. **aircraft_logbook**: Historial de mantenimiento
8. **flight_log**: Registro completo de cada vuelo

#### Configuración (2 tablas) - Módulo: Settings
9. **checklist_template**: Checklists personalizables por fase
10. **user_preferences**: Unidades preferidas, idioma, alertas, **módulos activos**

**Ver documentación completa**: `DATABASE_SCHEMA.md` y `TABLES_SUMMARY.md`

## Diferencias con Proyectos Empresariales

| Aspecto | Hernancius Aviation | Proyectos Futuros |
|---------|---------------------|-------------------|
| Autenticación | ✅ Sí (OAuth Google/Facebook, JWT en cookie, sin contraseñas) | ✅ Sí (JWT, OAuth) |
| Permisos | ✅ Sí (roles `admin` / `student` + entitlements por suscripción) | ✅ Sí (Roles: GOD, Admin, User, Viewer) |
| Usuarios | Multi-user con registro público | Multi-user |
| Pagos | ✅ Mercado Pago (CLP), checkout alojado | - |
| Storage | PostgreSQL 10.23 en servidor | Backend + Local cache |
| Sincronización offline | ❌ No (backlog) | ✅ Sí |
| API | ✅ REST (Express 5) | ✅ REST/GraphQL |

## Reglas Globales Aplicables

### ✅ Aplican a este proyecto:
- HR_UI_EnforceLocalization
- HR_UI_EnforceThemeImport
- HR_UI_EnforceFontRobotoThin
- HR_UI_EnforceShowModal
- HR_Architecture_EnforceSOLID
- HR_Architecture_EnforceModular
- HR_UI_EnforceConsistentStyles
- HR_UI_EnforceInfoModal
- HR_NamingConvention
- HR_UI_EnforceL10N

### ✅ Aplican por el nuevo alcance SaaS:
- HR_Permissions_EnforceRoleCheck (roles admin/student)
- Reglas de autenticación (OAuth, sesiones, CSRF)

## Consideraciones de Seguridad

Con datos en un servidor, se deben considerar:

1. **Privacidad de Datos**
   - Los datos se almacenan en PostgreSQL en el hosting, aislados por `user_id`; minimización (solo nombre, email, avatar del proveedor)
   - HTTPS + HSTS obligatorio; `helmet` (CSP); `cors` con allowlist; `express-rate-limit`; token CSRF
   - Sin contraseñas locales (OAuth); JWT en cookie httpOnly firmado con secreto en `.env` (nunca en el repo)
   - Pagos con checkout alojado de Mercado Pago: **ningún dato de tarjeta** en nuestro servidor (PCI SAQ-A)
   - Subida segura de archivos (tipo/tamaño, fuera del web root), auditoría, eliminación y exportación de cuenta
   - Cumplimiento Ley 19.628 / Ley 21.719 (Chile): consentimiento, derechos de titulares, procedimiento ante brechas (confirmar con asesoría legal)
   - Consultas SQL siempre parametrizadas (prevención de inyección)
   - Backups de la base de datos (cPanel / `pg_dump`) programados

2. **Credenciales de APIs Externas**
   - Las API keys (AVWX, OpenWeatherMap, Twitch) viven solo en el `.env` del backend
   - El frontend consulta METAR/TAF a través de un proxy del backend
   - ⚠️ El prototipo estático actual expone una API key en `js/config.js`: debe rotarse y moverse al backend

3. **Exportación de Datos**
   - Los exports a Excel no deben contener información sensible innecesaria
   - El usuario controla cuándo y dónde exporta sus datos

## Extensibilidad Futura

Si en el futuro se requiere añadir:

### Modo Offline (PWA)
- Service worker + caché de lecturas
- Cola de escrituras offline usando los campos reservados (`synced_at`, `version`, `conflict_status`)
- Resolución de conflictos

### Otras Autoridades LATAM
- Agregar autoridades (Ecuador RDAC, Bolivia RAB, Perú RAP) como datos en `authority` / `regulation_reference`
- Precios y moneda por país

---

## 👨‍💻 Expertise Técnico Requerido

### Perfil Dual del Desarrollador

El desarrollo de Hernancius Aviation requiere un perfil técnico especializado con dos áreas de expertise:

#### **1. Programación Senior**
- **React** (Vite): SPA moderna, hooks, code splitting
- **Node.js 20 + Express 5**: API REST, OAuth (passport), seguridad (helmet, cors, CSRF, rate limit), webhooks de Mercado Pago
- **PostgreSQL 10.23**: SQL plano con `pg`, migraciones idempotentes, sin funcionalidades PG11+
- **Arquitectura**: SOLID, Clean Architecture, Modular Design
- **State Management**: Context API / hooks, arquitectura reactiva
- **UI/UX**: Material Design (web), accesibilidad, responsive design
- **Despliegue**: cPanel "Setup Node.js App" (Passenger) con Node.js 20.20.2 (confirmado)

#### **2. Ingeniería Aeronáutica**
- Normativa DGAC Chile (DAN/DAR), en particular licencias de piloto privado (DAN 61)
- Conocimiento de aviación comercial y general
- Comprensión de procedimientos IFR/VFR
- Familiaridad con:
  - Planes de vuelo en formato ICAO
  - Cálculos de navegación (rumbo, distancia, tiempo, viento)
  - Performance de aeronaves (despegue, aterrizaje, crucero)
  - Peso y balance (centro de gravedad)
  - Combustible y autonomía
  - Procedimientos SID/STAR
  - Aproximaciones instrumentales (ILS, RNAV, VOR)

### Fuentes de Información

Durante el desarrollo, se deben consultar fuentes aeronáuticas oficiales para garantizar precisión:

**Organizaciones**:
- ICAO (International Civil Aviation Organization)
- FAA (Federal Aviation Administration)
- EASA (European Union Aviation Safety Agency)
- EUROCONTROL

**Publicaciones**:
- AIP (Aeronautical Information Publication)
- Pilot's Handbook of Aeronautical Knowledge (FAA)
- Instrument Procedures Handbook (FAA)
- POH/AFM de fabricantes

**Bases de Datos**:
- SkyVector (cartas aeronáuticas)
- OurAirports (aeropuertos globales)
- OpenNav (waypoints y aerovías)

### Validación de Cálculos

Todos los cálculos críticos deben:
- Validarse contra herramientas certificadas (E6B calculator)
- Incluir tests unitarios
- Documentar fuentes y fórmulas
- Compararse con casos reales
- Incluir factores de seguridad apropiados

### Disclaimer Legal

La aplicación debe incluir disclaimers claros indicando que es una herramienta de asistencia y NO sustituye:
- Cálculos oficiales requeridos por autoridades
- Manuales de vuelo oficiales (POH/AFM)
- Briefings meteorológicos certificados
- Planes de vuelo oficiales presentados a ATC

El piloto al mando es siempre responsable de verificar todos los datos.

**Ver**: `ROADMAP.md` - Sección "Expertise Técnico y Fuentes de Información" para lista completa de recursos.

---

**Última actualización**: 20 de octubre de 2026
**Versión**: 2.0.0 - SaaS multiusuario (OAuth, Mercado Pago, DGAC Chile) - React + Node.js 20/Express 5 + PostgreSQL 10.23
