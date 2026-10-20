# ✅ Checklist de Preparación para Desarrollo
## Hernancius Aviation - Lista de Verificación

**Fecha**: 21 de Noviembre, 2025 (actualizado 20 de octubre de 2026: nuevo stack React + Node.js/Express + PostgreSQL 10.23)  
**Estado**: ⏳ Pendiente Revisión del Cliente — ver `DEVELOPMENT_PLAN.md`

---

## 📋 Documentación Completa

### ✅ Documentos Creados

1. **README.md** ✅
   - Descripción del proyecto
   - Arquitectura modular
   - Identidad visual (logo)
   - Reglas de desarrollo

2. **ROADMAP.md** ✅
   - Objetivos a corto, mediano y largo plazo
   - Planificación de vuelos IFR detallada
   - Especificaciones UI/UX (light/dark, tipografía)
   - Logo y reloj UTC/Local
   - Componentes y pantallas
   - Plan de implementación (semanas)
   - Aplicación web responsive (escritorio, tablet, móvil)

3. **DATABASE_SCHEMA.md** ✅
   - 10 tablas definidas con SQL completo
   - Esquema de ruta IFR en formato ICAO
   - Sistema de alertas automáticas
   - Índices y relaciones
   - Cálculos automáticos (capa de servicio, PostgreSQL 10.23)

4. **TABLES_SUMMARY.md** ✅
   - Resumen rápido de todas las tablas
   - Propósito de cada tabla
   - Campos principales

5. **ARCHITECTURE_NOTES.md** ✅
   - Decisiones de diseño
   - SaaS multiusuario: login Google/Facebook, roles, suscripción Mercado Pago
   - Servidor PostgreSQL como fuente de verdad
   - Modular y SOLID

6. **UI_UX_SUGGESTIONS.md** ✅
   - 20 sugerencias adicionales de UI/UX
   - Priorización (Alta/Media/Baja)
   - Notas de implementación

7. **LOGO_INFO.md** ✅
   - Especificaciones del logo Hernancius Aviator
   - Usos en la aplicación
   - Formatos requeridos
   - Colores (#B8985F)

8. **GITHUB_SETUP.md** ✅
   - Instrucciones para configuración de GitHub
   - Comandos git paso a paso

---

## 🎨 Identidad Visual Definida

### ✅ Logo "Hernancius Aviator"

- **Diseño**: Casco espartano dorado con alas, corona de laurel, avión en el centro
- **Color**: Dorado/Beige (#B8985F)
- **Ubicación**: `/assets/images/logo.png`
- **Usos**:
  - Splash screen
  - App header (versión pequeña)
  - Dashboard (logo completo)
  - About/Settings
  - Exportaciones PDF

### ✅ Temas de Color

**Modo Claro**:
- Primary: #1E3A8A (Azul Oscuro)
- Primary Variant: #3B82F6 (Azul Claro)
- Background: #FFFFFF
- Surface: #F3F4F6
- Text: #1F2937

**Modo Oscuro**:
- Primary: #3B82F6 (Azul Claro)
- Primary Variant: #1E3A8A (Azul Oscuro)
- Background: #111827
- Surface: #1F2937
- Text: #F9FAFB

### ✅ Tipografía

- **Fuente**: Roboto Thin
- **Tamaño adaptativo**: 0.85x a 2.0x del tamaño del sistema
- **Jerarquía**:
  - Display: 2.5x (títulos principales)
  - Headline: 2x (secciones)
  - Title: 1.5x (subtítulos)
  - Body: 1x (texto normal)
  - Caption: 0.85x (texto pequeño)

---

## 🗄️ Base de Datos Completa

### ✅ Tablas Definidas (10 total)

1. **pilot** - Información del piloto
2. **pilot_licenses** - Licencias y certificaciones
3. **pilot_logbook** - Bitácora personal con rutas IFR
4. **aircraft_manufacturer** - Fabricantes
5. **aircraft_model** - Modelos con parámetros
6. **aircraft** - Aeronaves del usuario
7. **aircraft_logbook** - Historial de mantenimiento
8. **flight_log** - Registro detallado de vuelos con ruta ICAO completa
9. **checklist_template** - Checklists personalizables
10. **user_preferences** - Configuración completa de UI/UX

### ✅ Formato de Ruta ICAO Documentado

**Ejemplo**: `SVMI/10L N0176F230 OSMAR2 OSMAR W20 CBC G443 PARDU SVMT/D299J.D06 SVMG`

**Campos en flight_log**:
- Aeropuertos de salida/llegada
- Pistas (departure_runway, arrival_runway)
- SID (Standard Instrument Departure)
- STAR (Standard Terminal Arrival)
- Tipo de aproximación (ILS, RNAV, VOR)
- Procedimiento de aproximación
- Waypoints separados
- Aerovías separadas
- Velocidad de crucero (kts)
- Altitud de crucero (ft)

---

## 🖥️ Dashboard Especificado

### ✅ Componentes del Dashboard

1. **Header**:
   - Logo Hernancius Aviator (versión completa o pequeña)
   - Título de la sección

2. **Reloj Dual** (componente `UtcClock`):
   - **Hora UTC (Zulu)**: Formato `23:45:30 Z`
   - **Hora Local**: Formato según configuración regional `20:45:30 -03:00`
   - Actualización en tiempo real (cada segundo)
   - Indicador visual de zona horaria

3. **Alertas Prioritarias**:
   - Vencimiento de licencias (30 días antes)
   - Vencimiento de certificado médico (60 días antes)
   - Mantenimiento próximo (5 horas antes)

4. **Acceso Rápido**:
   - Aeronaves
   - Bitácora
   - Planificación de vuelos
   - Mantenimiento

5. **Estadísticas**:
   - Horas totales de vuelo
   - Vuelos del mes
   - Próximos mantenimientos

---

## 📱 Funcionalidades Principales

### ✅ Fase 1 - Fundación (Semanas 1-12)

1. **Gestión de Aeronaves**
   - CRUD completo
   - Parámetros de performance
   - Documentación
   - Historial de mantenimiento

2. **Bitácora Personal**
   - Perfil del piloto
   - Licencias y certificaciones
   - Registro de vuelos con **ruta ICAO completa**
   - Exportación a Excel

3. **Herramientas de Cálculo**
   - Conversión de unidades (16 tipos)
   - Cálculos de combustible
   - Peso y balance
   - Performance

### ✅ Fase 2 - Planificación (Semanas 13-20)

4. **Planificación de Vuelos IFR/VFR**
   - Definición de ruta completa:
     - Aeropuerto salida/llegada (ICAO)
     - Pistas
     - SID y STAR
     - Waypoints y aerovías
     - Tipo de aproximación
   - Cálculos:
     - Navegación (distancia, rumbo, tiempo)
     - Combustible (requerido, reserva, alternativa)
     - Peso y balance
     - Performance (despegue, aterrizaje, ascenso)
     - Económicos (costos)
   - Plan de vuelo completo
   - NavLog detallado
   - Exportación PDF/Excel
   - **Almacenamiento en formato ICAO estándar**

5. **Mantenimiento Predictivo**
   - Alertas automáticas
   - Registro de inspecciones
   - Gestión de repuestos

6. **Dashboard de Operaciones**
   - Logo + Reloj UTC/Local
   - Vista general de flota
   - Estadísticas en tiempo real
   - Alertas prioritarias

---

## 🛠️ Stack Tecnológico Definido

### ✅ Frontend

- **Framework**: React (Vite)
- **Language**: JavaScript
- **State Management**: Context API / hooks
- **Routing**: react-router-dom (propuesto)

### ✅ Backend y Almacenamiento

- **API**: Node.js + Express 5
- **Database**: PostgreSQL 10.23 (sin funcionalidades PG11+)
- **Acceso a datos**: SQL plano con `pg` (sin ORM)
- **Migraciones**: `.sql` numerados e idempotentes en `backend/migrations/`, aplicados al arrancar (`schema_migrations`)
- **Auth/seguridad**: Google/Facebook OAuth (sin contraseñas), JWT en cookie httpOnly + CSRF, helmet, cors (allowlist), rate limit, dotenv
- **Runtime**: Node.js 20 (cPanel 20.20.2)
- **Pagos**: Mercado Pago (suscripción 5.000 CLP/mes)
- **Restricción**: solo paquetes JavaScript puros (sin módulos nativos)
- **Hosting (supuesto a confirmar)**: cPanel "Setup Node.js App" (Passenger); local con Docker Compose `postgres:10`

### ✅ UI/UX

- **Theming**: ThemeProvider de React + variables CSS
- **Fonts**: Roboto (Google Fonts)
- **Icons**: Material Icons (web) + SVG
- **Localización**: i18next + react-i18next (propuesto)
- **Idiomas**: Español, Inglés, Portugués

### ✅ Exportación

- **Excel**: librería JS pura (a decidir)
- **PDF**: librería JS pura (a decidir)

### ✅ Futuros (Fase 3)

- **Geolocalización**: Geolocation API del navegador
- **Voz**: Web Speech API
- **Meteorología**: APIs externas vía proxy del backend (AVWX ya usada en el prototipo)

---

## 📂 Estructura del Proyecto

### ✅ Arquitectura Modular

```
backend/
├── migrations/       # 001_init.sql, 002_seed_catalogs.sql, ...
└── src/
    ├── core/         # config, db (pool, migrate, tx), middleware (auth JWT, errores)
    └── modules/      # auth, aircraft, logbook, flight_planning, maintenance, reports, weather, settings

frontend/
└── src/
    ├── core/         # api, auth, theme, i18n, components (InfoModal, UtcClock ⬅️ NUEVO, Card...)
    ├── modules/      # aircraft, logbook, flight_planning, tools, weather, maintenance, reports, settings
    └── main.jsx
```

### ✅ Assets

```
assets/
└── images/
    ├── logo.png           ⬅️ PENDIENTE: Guardar imagen
    ├── logo_icon.png      ⬅️ PENDIENTE: Crear variante
    ├── logo_white.png     ⬅️ PENDIENTE: Versión para dark mode
    ├── logo_small.png     ⬅️ PENDIENTE: Versión optimizada
    └── LOGO_INFO.md       ✅
```

---

## 🎯 Próximos Pasos para Iniciar Desarrollo

### 1️⃣ Revisión del Cliente (TÚ)

- [ ] Revisar ROADMAP.md completo
- [ ] Verificar DATABASE_SCHEMA.md
- [ ] Aprobar especificaciones de logo y dashboard
- [ ] Confirmar ruta IFR en formato ICAO
- [ ] Validar stack tecnológico
- [ ] Dar luz verde para iniciar desarrollo

### 2️⃣ Preparación de Assets

- [ ] Guardar archivo de imagen del logo (logo.png)
- [ ] Generar variantes del logo:
  - logo_icon.png (solo icono)
  - logo_white.png (versión blanca)
  - logo_small.png (optimizada)
- [ ] Generar favicon e iconos PWA para navegadores

### 3️⃣ Configuración Inicial (Desarrollador)

- [ ] Confirmar hosting cPanel (versión de Node.js, PostgreSQL 10.23, SSL)
- [ ] Crear `backend/` (Express 5 + `pg`) y `frontend/` (Vite + React)
- [ ] Configurar PostgreSQL 10 local (Docker Compose) y migraciones `.sql`
- [ ] Implementar login JWT
- [ ] Implementar componente `UtcClock`
- [ ] Implementar página `Home` con dashboard completo

### 4️⃣ Implementación Fase 1

- [ ] Módulo de Aeronaves (Semanas 5-8)
- [ ] Módulo de Bitácora (Semanas 9-12)
- [ ] Herramientas de Cálculo (Semanas 13-16)

---

## ✨ Características Destacadas

### 🏆 Diferenciadores del Proyecto

1. **Ruta IFR Completa en Formato ICAO**
   - Único sistema que almacena SID, STAR, waypoints, aerovías
   - Análisis histórico de rutas
   - Cumplimiento regulatorio total

2. **Reloj Dual UTC/Local**
   - Esencial para aviación internacional
   - Actualización en tiempo real
   - Formato estándar aeronáutico

3. **Logo Profesional "Hernancius Aviator"**
   - Identidad visual fuerte
   - Simbolismo de fortaleza + aviación
   - Diseño elegante y minimalista

4. **Calculadoras en el Navegador**
   - Conversores y cálculos sin llamadas al servidor
   - Modo offline completo: backlog (PWA)

5. **Aplicación Web Responsive**
   - Escritorio, tablet y móvil desde el navegador
   - Sin instalación

6. **SaaS para Alumnos PPL**
   - Login con Google/Facebook, roles alumno/admin
   - Herramientas gratuitas sin login + suscripción 5.000 CLP/mes (Mercado Pago)
   - Educación y exámenes según DGAC Chile (DAN/DAR)

---

## 📊 Estado del Proyecto

### Commits Realizados

```
✅ Initial commit
✅ docs: README completo
✅ docs: ROADMAP y GitHub setup
✅ refactor: Sin autenticación
✅ feat: Esquema de base de datos (10 tablas)
✅ feat: Planificación detallada + UI/UX
✅ feat: Almacenamiento de ruta IFR en formato ICAO
✅ feat: Logo Hernancius Aviator + Reloj UTC/Local
```

### Progreso General

- **Planificación**: 100% ✅ (re-planificada para el nuevo stack en `DEVELOPMENT_PLAN.md`)
- **Documentación**: 100% ✅
- **Diseño Visual**: 100% ✅
- **Implementación**: prototipos HTML/Tailwind/JS estáticos (conversor, calculadora de vuelo, METAR/TAF, navegación, procedimientos); app React/Node: 0% ⏳

---

## 🚀 ¿Listo para Iniciar?

Una vez que revises y apruebes toda la documentación:

1. Confirma que todo está correcto
2. Proporciona el archivo de imagen del logo
3. Daremos inicio al desarrollo con:
   - Configuración de backend + base de datos PostgreSQL 10.23
   - Implementación del reloj UTC/Local
   - Dashboard con logo
   - Módulo de aeronaves

---

**Última actualización**: 21 de Noviembre, 2025  
**Estado**: ⏳ **PENDIENTE REVISIÓN Y APROBACIÓN DEL CLIENTE**

---

## 📞 Contacto

Para cualquier cambio o sugerencia antes de iniciar el desarrollo, por favor comunícalo ahora.

¡Estamos listos para construir tu asistente personal de vuelo! ✈️
