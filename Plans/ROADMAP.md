# Hernancius Aviation - ROADMAP 🗺️

## Propósito de la Aplicación

**Hernancius Aviation** es una **plataforma SaaS multiusuario para aspirantes a piloto privado (alumnos PPL)** con todo lo necesario para aprender y prepararse: **educación** (cursos por materia teórica), **evaluación** (banco de preguntas, quizzes y simulacros con puntaje ponderado) y **herramientas operacionales** (vuelos, bitácora, cartas, estimaciones, planificación de vuelo, calculadora de vuelo y conversor de unidades modernos, checklists de aeronave subidos por el usuario).

**Usuarios objetivo**: Alumnos de piloto privado (PPL) y pilotos en formación. Mercado de lanzamiento: **Chile** (normativa **DGAC Chile, DAN/DAR**). Futuro: otros países de Latinoamérica con su propia autoridad (Ecuador RDAC, Bolivia RAB, Perú RAP, etc.).

**Modelo de negocio**: suscripción mensual de **5.000 CLP** pagada con tarjeta vía **Mercado Pago** (checkout alojado + webhooks). Prueba gratuita: por definir.

- **GRATIS (sin login, canal de adquisición)**: calculadora de vuelo, conversor de unidades, decodificador METAR/TAF (port y mejora de `js/weather-decoder.js` / `js/weather-api.js`) y la nueva calculadora de velocidades (IAS → CAS → EAS → TAS → GS). Herramientas modernas, rápidas, mobile-first, con URLs compartibles e indexables por buscadores (prerenderizado estático, meta/OG, sitemap) y una invitación suave a suscribirse. Se publican en producción **antes** del área pagada.
- **PAGADO**: todo lo demás (educación, exámenes, bitácora, vuelos, aeronaves, cartas, planificación/estimaciones, checklists, reportes).

**Contenido**: lo escribe el dueño de la plataforma (instructor de vuelo) desde un área de administración (editor enriquecido, carga de medios, importación CSV/JSON de preguntas, borrador/publicación y versionado).

## Nombre del Proyecto

**Hernancius Aviation** - Asistente Personal de Vuelo

## Objetivos Principales

### Objetivos de la Plataforma SaaS (prioritarios, v2)

0. **Identidad, Suscripción y Seguridad**
   - Registro e inicio de sesión con Google y Facebook (sin contraseñas)
   - Roles alumno / administrador
   - Suscripción mensual 5.000 CLP con Mercado Pago (preapproval + webhooks)
   - Seguridad y privacidad transversales (Ley 19.628 / 21.719)

1. **Espacio de Educación**
   - Materias PPL según DGAC Chile → módulos → lecciones (texto enriquecido, imágenes, PDFs, videos)
   - Progreso por usuario
   - Área de administración de contenidos con versionado y etiquetas normativas (DAN/DAR)

2. **Evaluación**
   - Banco de preguntas por materia (selección múltiple), importación CSV/JSON
   - Quizzes por materia y simulacro completo con tiempo
   - Puntaje automático ponderado, umbral de aprobación, historial y estadísticas por materia

### Objetivos a Corto Plazo (Fase 1)

1. **Gestión de Aeronaves**
   - Registro y seguimiento de aeronaves
   - Historial de mantenimiento
   - Estado operacional
   - Documentación técnica
   - Parametros de vuelo
   - Parametros de performance
   - tipo y caracteristicas de la aeronave

2. **Bitácora de Vuelo Personal**
   - Perfil del piloto
   - Licencias y certificaciones
   - Bitácora de horas de vuelo (por categoría: PIC, SIC, dual, night, IFR, etc.)
   - **Registro completo de vuelos realizados**:
     - Aeropuertos de salida y llegada
     - Ruta completa en formato ICAO (SID, waypoints, aerovías, STAR, aproximación)
     - Procedimientos IFR utilizados
     - Tiempos de vuelo
     - Condiciones (VFR/IFR, día/noche)
   - Exportación de horas de vuelo a Excel con rutas detalladas

### Objetivos a Mediano Plazo (Fase 2)

4. **Planificación de Vuelos** (Módulo detallado)
   
   **Pre-vuelo y Planificación**:
   - Selección de aeronave (carga automática de parámetros)
   - **Definición de ruta completa IFR/VFR**:
     - Aeropuerto de salida (código ICAO: ej. SVMI)
     - Pista de salida (ej. 10L, 28R)
     - SID - Standard Instrument Departure (ej. OSMAR2)
     - Waypoints en ruta (ej. OSMAR, CBC, PARDU)
     - Aerovías (ej. W20, G443)
     - STAR - Standard Terminal Arrival (ej. SVMT/D299J)
     - Tipo de aproximación (ILS, RNAV, VOR, Visual)
     - Procedimiento de aproximación (ej. D06)
     - Pista de llegada
     - Aeropuerto de destino (código ICAO: ej. SVMG)
     - Aeropuertos alternos
     - **Formato ICAO estándar guardado**: 
       `SVMI/10L N0176F230 OSMAR2 OSMAR W20 CBC G443 PARDU SVMT/D299J.D06 SVMG`
   - Información meteorológica (integración futura)
   - NOTAMs (integración futura)
   
   **Cálculos de Navegación**:
   - Distancia total y por tramo
   - Rumbo magnético y verdadero
   - Tiempo de vuelo estimado (considerando viento)
   - Altitud de crucero óptima
   - Velocidad de crucero (TAS, GS, IAS)
   - Corrección de viento (drift angle)
   
   **Cálculos de Combustible**:
   - Combustible requerido por tramo
   - Combustible de reserva (45 min, VFR/IFR)
   - Combustible para alternativa
   - Total de combustible requerido
   - Validación vs capacidad de la aeronave
   
   **Cálculos de Peso y Balance**:
   - Peso vacío + combustible + carga
   - Validación vs peso máximo de despegue
   - Centro de gravedad (CG)
   - Verificación de límites CG
   
   **Cálculos de Performance**:
   - Distancia de despegue requerida
   - Distancia de aterrizaje requerida
   - Razón de ascenso esperada
   - Tiempo y distancia al techo de crucero
   
   **Cálculos Económicos**:
   - Costo de combustible
   - Costos operacionales por hora
   - Costo total del vuelo
   - Costo por pasajero/milla
   
   **Plan de Vuelo**:
   - Generación de plan de vuelo completo en formato ICAO
   - Log de navegación (NavLog) detallado por tramo
   - **Almacenamiento de ruta completa**: Incluye SID, STAR, waypoints, aerovías, aproximación
   - Registro en bitácora con ruta en formato estándar
   - Checklist específico para el vuelo
   - Exportación a PDF/Excel con todos los detalles IFR
   - Guardado de plan para referencia en vuelo
   - Acceso rápido a ruta durante ejecución del vuelo

5. **Mantenimiento Predictivo**
   - Alertas de mantenimiento programado
   - Registro de inspecciones
   - Gestión de repuestos
   - Historial de reparaciones

6. **Dashboard de Operaciones**
   - **Logo de la aplicación**: Hernancius Aviator en header
   - **Reloj dual**:
     - Hora UTC (Zulu Time) - Formato: 23:45:30 Z
     - Hora Local - Formato según configuración regional
     - Actualización en tiempo real (cada segundo)
     - Indicador visual de zona horaria
   - Vista general de la flota
   - Estadísticas en tiempo real
   - Métricas de rendimiento
   - Alertas y notificaciones prioritarias
   - Próximos vuelos programados
   - Reportes operacionales

### Objetivos a Largo Plazo (Fase 3)

7. **Integración con Sistemas Externos**
   - APIs de meteorología
   - Sistemas de planificación de vuelos
   - Bases de datos de aeropuertos
   - Sistemas de facturación

8. **Analytics Avanzado**
   - Análisis de costos operacionales
   - Predicción de mantenimiento basado en ML
   - Optimización de rutas
   - Reportes financieros

9. **Modo Offline / PWA** (idea, no comprometida)
   - Sincronización de datos
   - Acceso sin conexión
   - Geolocalización
   - Notificaciones push

## Arquitectura Modular Independiente

### Concepto de Módulos Autónomos

**Hernancius Aviation** utiliza una arquitectura modular donde cada módulo funcional es completamente independiente y autónomo. Esta decisión arquitectónica permite:

- ✅ **Feature Toggles**: Habilitar/deshabilitar módulos desde configuración
- ✅ **Desarrollo Aislado**: Cambios en un módulo no afectan otros
- ✅ **Mantenibilidad**: Código organizado por dominio funcional
- ✅ **Testing Independiente**: Tests por módulo sin dependencias cruzadas
- ✅ **Escalabilidad**: Agregar nuevos módulos sin modificar código existente

### Estructura de un Módulo

Cada módulo contiene su propia estructura interna completa:

```
backend/src/modules/[nombre_modulo]/
├── [nombre].routes.js       # Rutas Express (montadas en /api/v1/[nombre])
├── [nombre].controller.js   # HTTP in/out, validación de entrada
├── [nombre].service.js      # Lógica de negocio (transacciones)
├── [nombre].repository.js   # SQL plano con `pg` (consultas parametrizadas)
└── [nombre].test.js         # Tests

frontend/src/modules/[nombre_modulo]/
├── pages/                   # Pantallas (rutas) del módulo
├── components/              # Componentes específicos del módulo
├── hooks/                   # Hooks de datos/estado
├── utils/                   # Cálculos y utilidades del módulo (JS puro, testeables)
├── api.js                   # Llamadas a la API del módulo
└── index.js                 # Punto de entrada y registro (moduleRegistry)
```

### Componentes Principales

#### **1. Módulo: Aircraft** (Gestión de Aeronaves)
**ID**: `aircraft` | **Toggle**: ✅ Habilitado por defecto

**Estructura**:
```
backend/src/modules/aircraft/     # aircraft.routes.js / .controller.js / .service.js / .repository.js
frontend/src/modules/aircraft/
├── pages/AircraftList, AircraftDetail, AircraftForm, ManufacturerForm, ModelForm, AircraftLogbook, FlightRecord
├── components/AircraftCard, AircraftSelector, LogbookEntry
├── hooks/, api.js
└── index.js                   # registro en moduleRegistry
```

**Funcionalidades**:
- CRUD completo de fabricantes y modelos
- Gestión de aeronaves del usuario
- Tracking de horas (hobbs, tach, airframe)
- Historial de mantenimiento
- Registro de vuelos por aeronave
- Documentos y parámetros técnicos

**Base de Datos**: 4 tablas (aircraft_manufacturer, aircraft_model, aircraft, aircraft_logbook)

---

#### **2. Módulo: Logbook** (Bitácora Personal)
**ID**: `logbook` | **Toggle**: ✅ Habilitado por defecto

**Estructura**:
```
backend/src/modules/logbook/     # logbook.routes.js / .controller.js / .service.js / .repository.js
frontend/src/modules/logbook/
├── pages/PilotProfile, Licenses, Logbook, FlightHistory
├── components/PilotCard, LicenseCard, LogbookSummary
├── hooks/, api.js
└── index.js                   # registro en moduleRegistry
```

**Funcionalidades**:
- Perfil del piloto
- Gestión de certificaciones y licencias
- Registro de horas de vuelo por categoría (PIC, SIC, dual, night, IFR)
- **Historial completo de vuelos**:
  - Rutas en formato ICAO (SID, waypoints, aerovías, STAR, aproximación)
  - Aeropuertos, pistas, procedimientos IFR
  - Tiempos, condiciones, aterrizajes
- Alertas de vencimientos (licencias, médico)
- Exportación a Excel con rutas detalladas

**Base de Datos**: 3 tablas (pilot, pilot_licenses, pilot_logbook)

---

#### **3. Módulo: Flight Planning** (Planificación de Vuelos)
**ID**: `flight_planning` | **Toggle**: ✅ Habilitado por defecto | **Dependencias**: aircraft, logbook

**Estructura**:
```
backend/src/modules/flight_planning/     # flight_planning.routes.js / .controller.js / .service.js / .repository.js
frontend/src/modules/flight_planning/
├── pages/FlightPlanner, RouteEditor, NavLog, FlightExecution
├── components/RouteMap, WaypointCard, NavLogTable; utils/navigation, fuel, weightBalance, performance
├── hooks/, api.js
└── index.js                   # registro en moduleRegistry
```

**Funcionalidades**:
- **Pre-vuelo**: Planificador completo con todos los cálculos
  - Definición de ruta IFR/VFR en formato ICAO
  - Selección de SID, STAR, aproximación, aerovías
  - Cálculos: navegación, combustible, peso/balance, performance
- **En-vuelo**: Acceso rápido a plan, ruta y checklist
- **Post-vuelo**: Registro automático en logbook con ruta completa
- Comparación plan vs real (fuel, time, distance, ruta)
- NavLog detallado por tramos
- Exportación a PDF/Excel

**Base de Datos**: 1 tabla (flight_log)

---

#### **4. Módulo: Tools** (Herramientas y Calculadoras)
**ID**: `tools` | **Toggle**: ✅ Habilitado por defecto

**Estructura**:
```
backend/src/modules/tools/     # sin backend (cálculos 100% en el navegador)
frontend/src/modules/tools/
├── pages/Calculator, Converter, E6B
├── components/CalculatorButton, ConversionCard; utils/unitConversions, aviationCalculations
├── hooks/, api.js
└── index.js                   # registro en moduleRegistry
```

**Funcionalidades**:
- **Conversión de 16 tipos de unidades**:
  - Velocidad: kts, km/h, mph, m/s, ft/s
  - Altitud/Distancia: m, km, inch, ft, sm, nm
  - Combustible/Volumen: L, USG, GAL, Qt, lQt
  - Peso: g, kg, t, lb, oz
  - Temperatura: °C, °F, K
  - Presión Barométrica: hPa, inHg, bar
  - Ángulos: grados, rad
  - Tiempo: decimal, reloj
- Calculadora E6B electrónica
- Cálculos de navegación quick
- Calculadoras especializadas

**Base de Datos**: 0 tablas (no persiste datos)

---

#### **5. Módulo: Maintenance** (Mantenimiento)
**ID**: `maintenance` | **Toggle**: ✅ Habilitado por defecto | **Dependencias**: aircraft

**Estructura**:
```
backend/src/modules/maintenance/     # maintenance.routes/controller/service/repository.js (lee aircraft_logbook)
frontend/src/modules/maintenance/
├── pages/MaintenanceList, MaintenanceForm, Alerts
├── components/MaintenanceCard, AlertBadge
├── hooks/, api.js
└── index.js                   # registro en moduleRegistry
```

**Funcionalidades**:
- Programación de mantenimiento predictivo
- Registro de inspecciones
- Gestión de repuestos
- Alertas automáticas de vencimientos
- Tracking de costos de mantenimiento
- Historial completo

**Base de Datos**: 0 tablas (usa aircraft_logbook)

---

#### **6. Módulo: Reports** (Reportes y Exportaciones)
**ID**: `reports` | **Toggle**: ✅ Habilitado por defecto | **Dependencias**: logbook, aircraft

**Estructura**:
```
backend/src/modules/reports/     # reports.routes/controller/service/repository.js + export (xlsx)
frontend/src/modules/reports/
├── pages/Reports, Statistics
├── components/Chart, ExportButton
├── hooks/, api.js
└── index.js                   # registro en moduleRegistry
```

**Funcionalidades**:
- Dashboard ejecutivo con estadísticas
- Reportes operacionales
- Análisis de horas de vuelo
- Gráficos y visualizaciones
- Exportación a Excel/PDF
- Reportes personalizables

**Base de Datos**: 0 tablas (consulta otras tablas)

---

#### **7. Módulo: Settings** (Configuración)
**ID**: `settings` | **Toggle**: ❌ SIEMPRE ACTIVO (Core)

**Estructura**:
```
backend/src/modules/settings/     # settings.routes.js / .controller.js / .service.js / .repository.js
frontend/src/modules/settings/
├── pages/Settings, ModuleManager, ThemeSettings, About
├── components/SettingTile, ModuleToggle
├── hooks/, api.js
└── index.js                   # registro en moduleRegistry
```

**Funcionalidades**:
- Ajustes generales de la aplicación
- **Gestión de módulos**: Habilitar/deshabilitar módulos
- Unidades de medida preferidas
- Configuración de tema (light/dark)
- Idioma (español, inglés, portugués)
- Preferencias de accesibilidad
- Densidad de información
- Configuración de notificaciones

**Base de Datos**: 1 tabla (user_preferences con campo enabled_modules)

## Estilos y Diseño

### Paleta de Colores

**Tema Claro (Light Mode)**:
- **Primary**: `#1E3A8A` (Azul Marino)
- **Secondary**: `#3B82F6` (Azul Cielo)
- **Background**: `#F8FAFC` (Gris Claro)
- **Surface**: `#FFFFFF` (Blanco)
- **Surface Variant**: `#E2E8F0` (Gris Medio)
- **Error**: `#DC2626` (Rojo)
- **Success**: `#16A34A` (Verde)
- **Warning**: `#FB923C` (Naranja)
- **Info**: `#0EA5E9` (Azul Info)
- **Text Primary**: `#1E293B` (Gris Oscuro)
- **Text Secondary**: `#64748B` (Gris Medio)
- **Text Disabled**: `#CBD5E1` (Gris Claro)
- **Divider**: `#E2E8F0` (Gris Muy Claro)

**Tema Oscuro (Dark Mode)**:
- **Primary**: `#60A5FA` (Azul Claro)
- **Secondary**: `#93C5FD` (Azul Muy Claro)
- **Background**: `#0F172A` (Azul Muy Oscuro)
- **Surface**: `#1E293B` (Azul Oscuro)
- **Surface Variant**: `#334155` (Azul Gris)
- **Error**: `#EF4444` (Rojo Claro)
- **Success**: `#22C55E` (Verde Claro)
- **Warning**: `#FB923C` (Naranja)
- **Info**: `#38BDF8` (Azul Info Claro)
- **Text Primary**: `#F1F5F9` (Gris Muy Claro)
- **Text Secondary**: `#94A3B8` (Gris Claro)
- **Text Disabled**: `#475569` (Gris Medio)
- **Divider**: `#334155` (Gris Oscuro)

**Colores de Aviación Específicos** (ambos temas):
- **VFR**: `#22C55E` (Verde - condiciones visuales)
- **IFR**: `#F59E0B` (Ámbar - condiciones instrumentos)
- **MVFR**: `#3B82F6` (Azul - marginales)
- **LIFR**: `#EF4444` (Rojo - bajo IFR)
- **Critical**: `#DC2626` (Rojo - alertas críticas)
- **Caution**: `#FB923C` (Naranja - precauciones)

### Tipografía

- **Fuente Principal**: Roboto (única familia de fuentes)
  - Regular: Texto normal
  - Medium: Énfasis
  - Bold: Títulos y elementos importantes
- **Tamaño Adaptativo**: Se ajusta según configuración del OS
  - Base: Sigue configuración de accesibilidad del sistema
  - Escala relativa mantenida para jerarquía visual
  - Mínimo legible: 12px (unidades `rem` relativas al tamaño del navegador)
  - Máximo: 200% del tamaño base
- **Jerarquía Visual**:
  - Display: Títulos principales (2.5x base)
  - Headline: Títulos de sección (2x base)
  - Title: Subtítulos (1.5x base)
  - Body: Texto normal (1x base)
  - Caption: Texto pequeño (0.85x base)

### Componentes UI

1. **Componentes Base (React)**
   - `InfoModal`: Modales informativos
   - `Card`: Tarjetas de contenido
   - `Button`: Botones personalizados
   - `Input`: Campos de entrada
   - `List`: Listas personalizadas
   - `UtcClock`: Reloj UTC/Local en tiempo real
     - Muestra hora Zulu (UTC) y hora local simultáneamente
     - Actualización cada segundo
     - Indicador visual de zona horaria
     - Formato: "23:45:30 Z | 20:45:30 -03:00"

2. **Pantallas (páginas)**
   - `Home`: Pantalla principal con dashboard
     - Logo de Hernancius Aviator en header
     - Reloj UTC/Local en tiempo real
     - Acceso rápido a funciones principales
   - `AircraftList`: Lista de aeronaves
   - `AircraftDetail`: Detalle de aeronave
   - `CrewList`: Lista de tripulación
   - `FlightPlanner`: Planificador de vuelos
   - `Maintenance`: Gestión de mantenimiento
   - `Reports`: Reportes y analytics
   - `Settings`: Configuración

### Logo de la Aplicación

**Hernancius Aviator**

- **Ubicación**: `/assets/images/logo.png`
- **Descripción**: 
  - Casco espartano dorado con alas
  - Corona de laurel superior
  - Avión en el centro del casco
  - Texto "HERNANCIUS AVIATOR" debajo
- **Colores**: Dorado/Beige (#B8985F) sobre fondo blanco/transparente
- **Simbolismo**: Fusión de fortaleza, disciplina y aviación

**Usos en la aplicación**:
1. **Pantalla de carga / Login**: Logo centrado con animación
2. **App Header**: Versión pequeña (40x40px) - solo icono
3. **Dashboard**: Logo completo en header superior
4. **About/Settings**: Logo completo + información de versión
5. **Exportaciones PDF**: Logo en header de documentos

**Formatos requeridos**:
- `logo.png` - Logo completo (1024x1024)
- `logo_icon.png` - Solo icono (512x512)
- `logo_white.png` - Versión blanca para dark mode
- Favicon e iconos PWA (192x192, 512x512) para navegadores

**Ver**: `/assets/images/LOGO_INFO.md` para especificaciones completas

### Iconografía

- **Estilo**: Material Icons (fuente web / SVG)
- **Tema**: Aviation-focused (avión, vuelo, navegación)
- **Tamaño Adaptativo**: Escala según configuración del sistema
  - Small: 20px
  - Medium: 24px (default)
  - Large: 28px
  - Extra Large: 32px

### Ajustes Visuales Adicionales

**1. Responsividad y Layouts**:
- **Breakpoints**:
  - Compact: <600px (teléfonos)
  - Medium: 600-840px (tablets pequeñas)
  - Expanded: >840px (tablets grandes, escritorio)
- **Orientación**:
  - Portrait: Layout vertical optimizado
  - Landscape: Layout horizontal con paneles laterales
- **Adaptación automática**: UI se reorganiza según tamaño de pantalla

**2. Modo de Alto Contraste** (Accesibilidad):
- Incremento de contraste de colores (WCAG AAA)
- Bordes más gruesos en elementos interactivos
- Separación visual más clara entre secciones
- Activación: Sigue configuración del sistema (`prefers-contrast`)

**3. Reducción de Movimiento** (Accesibilidad):
- Desactiva animaciones complejas
- Transiciones instantáneas o muy rápidas
- Respeta configuración de accesibilidad del OS (`prefers-reduced-motion`)

**4. Densidad de Información**:
- **Compacto**: Más información, menos espaciado (para expertos)
- **Comfortable**: Balance entre información y espaciado (default)
- **Spacious**: Más espaciado, menos elementos por pantalla (para facilidad de lectura)

**5. Visualización de Datos Críticos**:
- **Indicadores de estado**: Colores semánticos (VFR/IFR/MVFR/LIFR)
- **Alertas visuales**: Iconos + colores + texto
- **Resaltado de valores críticos**: Peso máximo, combustible mínimo, etc.
- **Modo de lectura en vuelo**: Fondo oscuro con texto grande para uso con luz solar

**6. Visualización de Unidades**:
- Mostrar unidades siempre junto a valores numéricos
- Opción de mostrar doble unidad (ej: "150 kts / 278 km/h")
- Resaltado de unidades seleccionadas en preferencias

**7. Espaciado y Padding**:
- **Extra Small**: 4px
- **Small**: 8px
- **Medium**: 16px
- **Large**: 24px
- **Extra Large**: 32px
- Escala según tamaño de pantalla y densidad

**8. Bordes y Elevaciones**:
- **Tema Claro**: Sombras suaves para elevación
- **Tema Oscuro**: Elevación por cambio de tono
- Border radius: 8px (consistente)
- Elevaciones: 0, 2, 4, 8, 16 (niveles de sombra CSS)

**9. Estados Interactivos**:
- **Normal**: Color base
- **Hover**: +10% brillo (escritorio)
- **Pressed**: -10% brillo
- **Focused**: Borde de enfoque visible (accesibilidad teclado)
- **Disabled**: 50% opacidad

**10. Idioma y Localización**:
- **Idiomas soportados**: Español, Inglés, Portugués
- **Detección automática**: Sigue idioma del navegador
- **Selección manual**: Guardada en user_preferences
- **Formato de fecha/hora**: Según configuración regional
- **Separadores decimales**: Según país (. o ,)

---

## 👨‍💻 Expertise Técnico y Fuentes de Información

### Perfil del Desarrollador

**IMPORTANTE**: El desarrollo de esta aplicación requiere un perfil técnico especializado con conocimientos duales:

#### 1. **Programación Senior**
- **React (Vite)**: SPA moderna, hooks, code splitting
- **Node.js 20 + Express 5**: API REST segura (helmet, cors, OAuth, JWT en cookie, CSRF)
- **PostgreSQL 10.23**: SQL plano con `pg`, migraciones idempotentes (sin funcionalidades PG11+)
- **State Management**: Context API / hooks, arquitectura reactiva
- **Arquitectura**: SOLID, Clean Architecture, Modular Design
- **UI/UX**: Material Design, accesibilidad, responsive design

#### 2. **Ingeniería Aeronáutica**
- Conocimientos de aviación comercial y general
- Comprensión de procedimientos IFR/VFR
- Familiaridad con:
  - Planes de vuelo en formato ICAO
  - Cálculos de navegación (rumbo, distancia, tiempo)
  - Performance de aeronaves
  - Peso y balance (CG)
  - Combustible y autonomía
  - Procedimientos SID/STAR
  - Aproximaciones instrumentales

### Fuentes de Información Aeronáutica Recomendadas

Para garantizar la precisión y validez de los cálculos y procedimientos, se recomienda consultar las siguientes fuentes oficiales durante el desarrollo:

#### **Organizaciones Internacionales**

1. **ICAO - International Civil Aviation Organization**
   - URL: https://www.icao.int
   - Contenido: Estándares y procedimientos internacionales
   - Uso: Formato de planes de vuelo, códigos ICAO, anexos técnicos

2. **FAA - Federal Aviation Administration** (USA)
   - URL: https://www.faa.gov
   - Contenido: Publicaciones aeronáuticas, AIM, FAR/AIM
   - Uso: Procedimientos estándar, regulaciones, manuales de piloto

3. **EASA - European Union Aviation Safety Agency**
   - URL: https://www.easa.europa.eu
   - Contenido: Regulaciones europeas, certificaciones
   - Uso: Estándares de mantenimiento, licencias, operaciones

4. **EUROCONTROL**
   - URL: https://www.eurocontrol.int
   - Contenido: Gestión de tráfico aéreo, procedimientos
   - Uso: Aerovías, waypoints, rutas estándar

#### **Publicaciones y Bases de Datos**

5. **AIP - Aeronautical Information Publication**
   - Contenido: Información de aeropuertos, procedimientos locales
   - Uso: SID, STAR, aproximaciones por país/región
   - Ejemplo: AIP Venezuela, AIP USA, AIP España

6. **SkyVector** 
   - URL: https://skyvector.com
   - Contenido: Cartas aeronáuticas gratuitas, waypoints
   - Uso: Visualización de rutas, identificación de waypoints

7. **OurAirports**
   - URL: https://ourairports.com
   - Contenido: Base de datos global de aeropuertos
   - Uso: Códigos ICAO/IATA, información de pistas

8. **OpenNav**
   - URL: https://opennav.com
   - Contenido: Datos de navegación abiertos
   - Uso: Waypoints, aerovías, frecuencias

#### **Calculadoras y Herramientas de Referencia**

9. **E6B Calculator** (Referencia física o digital)
   - Uso: Validar cálculos de navegación, viento, tiempo

10. **Aircraft Performance Charts**
    - Fuente: POH/AFM de fabricantes (Cessna, Piper, Beechcraft)
    - Uso: Validar cálculos de performance, despegue, aterrizaje

#### **Recursos Técnicos**

11. **Aviation Stack Exchange**
    - URL: https://aviation.stackexchange.com
    - Contenido: Comunidad de pilotos y profesionales
    - Uso: Validación de cálculos, mejores prácticas

12. **Pilot's Handbook of Aeronautical Knowledge** (FAA)
    - URL: https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/phak
    - Contenido: Manual completo de conocimiento aeronáutico
    - Uso: Fundamentos, meteorología, navegación, performance

13. **Instrument Procedures Handbook** (FAA)
    - URL: https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/instrument_procedures_handbook
    - Contenido: Procedimientos instrumentales detallados
    - Uso: IFR, aproximaciones, SID/STAR

### Aplicación en el Desarrollo

Durante la implementación de cada módulo, se debe:

1. **Validar Fórmulas**
   - Consultar manuales oficiales (FAA, ICAO)
   - Verificar unidades y conversiones
   - Comparar resultados con E6B o calculadoras certificadas

2. **Verificar Formatos**
   - Plan de vuelo según ICAO Doc 4444
   - Códigos de aeropuertos (ICAO/IATA)
   - Formato de waypoints y aerovías

3. **Cumplir Regulaciones**
   - Reservas de combustible según tipo de vuelo (VFR/IFR)
   - Límites de peso y balance según POH
   - Altitudes mínimas de seguridad

4. **Precisión en Cálculos**
   - Redondeo apropiado (ej. combustible a décima de galón)
   - Consideración de factores de seguridad
   - Validación con casos reales

5. **Terminología Correcta**
   - Usar términos aeronáuticos estándar
   - Traducción precisa a español/portugués
   - Abreviaturas según ICAO

### Recomendaciones de Desarrollo

- ✅ Implementar **tests unitarios** para cálculos críticos
- ✅ Comparar resultados con herramientas certificadas
- ✅ Documentar **fuentes y fórmulas** en código
- ✅ Incluir **disclaimers** apropiados (uso educacional)
- ✅ Validar con **pilotos certificados** antes de release
- ✅ Mantener **actualizaciones** según cambios en regulaciones

### Disclaimer Importante

> ⚠️ **NOTA LEGAL**: Esta aplicación es una herramienta de asistencia personal y NO sustituye:
> - Cálculos oficiales requeridos por autoridades aeronáuticas
> - Manuales de vuelo oficiales (POH/AFM)
> - Briefings meteorológicos certificados
> - Planes de vuelo oficiales presentados a ATC
> 
> El piloto al mando es siempre responsable de verificar todos los datos y cálculos antes del vuelo.

---

## Arquitectura Técnica

### Stack Tecnológico

> **Cambio de stack (oct 2026)**: se reemplaza Flutter/Dart + SQLite por una aplicación web. Detalle completo, decisiones y tareas en `DEVELOPMENT_PLAN.md`.

- **Frontend**: React (Vite), SPA
- **Backend**: Node.js 20 LTS (cPanel 20.20.2) + Express 5
- **Base de Datos**: PostgreSQL **10.23** (sin funcionalidades PG11+)
- **Acceso a datos**: SQL plano con el driver `pg` (sin ORM)
- **Autenticación**: Google/Facebook OAuth (`passport`), sin contraseñas; sesión JWT (`jsonwebtoken`) en cookie httpOnly + CSRF
- **Pagos**: Mercado Pago (suscripciones/preapproval, CLP) detrás de un módulo de billing agnóstico de proveedor
- **Seguridad**: `helmet`, `cors` con allowlist, `dotenv` para configuración
- **Restricción**: solo paquetes npm 100% JavaScript (sin módulos nativos)
- **Migraciones**: archivos `.sql` numerados e idempotentes en `backend/migrations/`, aplicados al arrancar y registrados en `schema_migrations`
- **Despliegue**: hosting compartido cPanel con "Setup Node.js App" (Passenger) y Node.js 20.20.2 (confirmado), sin Docker en producción. Desarrollo local con Docker Compose (`postgres:10`).

### Paquetes

**Backend** (JavaScript puro):
- `express` (v5) - Servidor HTTP
- `pg` - Driver PostgreSQL
- `jsonwebtoken` - JWT (cookie de sesión)
- `passport`, `passport-google-oauth20`, `passport-facebook` - Login social
- `mercadopago` (solo si es JS puro) o HTTPS directo - Suscripciones
- `express-rate-limit`, `sanitize-html` - Seguridad
- `helmet` - Cabeceras de seguridad
- `cors` - CORS con allowlist
- `dotenv` - Variables de entorno

**Frontend** (propuestos, ver Decisiones en `DEVELOPMENT_PLAN.md`):
- `react`, `react-dom`, `vite`
- Enrutamiento: `react-router-dom`
- Internacionalización: `i18next` + `react-i18next`
- Gráficas: `chart.js` (ya usado en los prototipos estáticos)
- Mapas: `leaflet` (ya usado en el prototipo de navegación)
- Exportación: Excel y PDF generados en el navegador o en el backend con librerías JS puras

**Plataformas Soportadas**:
- ✓ Navegadores modernos de escritorio (Chrome, Edge, Firefox, Safari)
- ✓ Navegadores móviles/tablet (diseño responsive)
- ✗ Apps nativas Android/iOS/Windows (fuera de alcance)
- ✗ Modo offline completo (backlog: PWA)

---

## 🔄 Base de Datos

### Filosofía: Servidor como Fuente de Verdad

**Concepto Principal**: Los datos viven en PostgreSQL 10.23 en el hosting. El frontend React consume una API REST autenticada. Las calculadoras y conversores funcionan en el navegador sin llamar al servidor.

### Arquitectura de Datos

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────────┐
│  React SPA      │ ◄─────► │  API REST            │ ◄─────► │ PostgreSQL 10.23    │
│  (Navegador)    │  HTTPS  │  Node.js + Express 5 │   pg    │ (hosting cPanel)    │
│                 │  + JWT  │  (Passenger)         │         │                     │
└─────────────────┘         └──────────────────────┘         └─────────────────────┘
```

**Características**:
- ✅ **PostgreSQL** como única fuente de verdad
- ✅ **UUIDs (v4)** generados por la app (`crypto.randomUUID()`), columnas de tipo `UUID`
- ✅ **Soft delete** (`is_deleted = TRUE/FALSE`)
- ✅ **Bloqueo optimista** con la columna `version` (respuesta `409 Conflict`)
- ✅ **Timestamps** `TIMESTAMPTZ` en UTC
- ✅ **Campos de sincronización** conservados como reservados para un futuro modo offline
- ✅ **Migraciones** SQL numeradas e idempotentes aplicadas al arrancar

**Implementación**:

1. **Esquema de BD**:
   - 10 tablas de dominio + `app_user` + `schema_migrations`
   - Ver: `DATABASE_SCHEMA.md`

2. **Capa de acceso** (`backend/src/core/db/`):
   ```js
   // pool.js
   const { Pool } = require('pg');
   const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

   // tx.js — transacción con un cliente del pool
   async function withTx(fn) {
     const client = await pool.connect();
     try {
       await client.query('BEGIN');
       const result = await fn(client);
       await client.query('COMMIT');
       return result;
     } catch (err) {
       await client.query('ROLLBACK');
       throw err;
     } finally {
       client.release();
     }
   }
   ```

3. **Generación de UUIDs**:
   ```js
   const { randomUUID } = require('node:crypto');
   const id = randomUUID(); // "550e8400-e29b-41d4-a716-446655440000"
   ```

4. **Soft Delete**:
   ```js
   // En lugar de DELETE
   await pool.query(
     'UPDATE pilot SET is_deleted = TRUE, updated_at = NOW(), version = version + 1 WHERE id = $1 AND user_id = $2',
     [id, userId]
   );

   // Consultas solo de registros activos
   const { rows } = await pool.query(
     'SELECT * FROM pilot WHERE user_id = $1 AND is_deleted = FALSE',
     [userId]
   );
   ```

**Estado**: ✅ **ENFOQUE ACTUAL - Iniciar desarrollo con esta base**

---

### Modo Offline / Sincronización (IDEA - NO COMPROMETIDA)

La versión anterior del plan contemplaba SQLite local + sincronización bidireccional con PostgreSQL (push/pull, resolución de conflictos por tabla, autenticación por dispositivo). Con el nuevo stack web esto pasa al **backlog** como posible PWA:

- Service worker + caché de lecturas (dashboard, checklists, último plan de vuelo)
- Cola de escrituras offline usando `synced_at`, `version`, `device_id`, `conflict_status`
- Estrategias de conflicto propuestas originalmente: `pilot`/`aircraft` manual, `pilot_licenses`/`pilot_logbook`/`aircraft_logbook` Last Write Wins, `flight_log` append-only, `user_preferences` local gana
- Endpoints tentativos: `POST /api/v1/sync/push`, `GET /api/v1/sync/pull`, `GET /api/v1/sync/status`, `POST /api/v1/sync/resolve`

**Estado**: 🔜 **No iniciar hasta completar el MVP web**

**Ver documentación completa**: `DATABASE_SCHEMA.md`

### Estructura de Módulos

Ver la estructura `backend/` + `frontend/` en `ARCHITECTURE_NOTES.md` y `DEVELOPMENT_PLAN.md`.

## Plan de Implementación

> El plan detallado (fases, tareas con ID, estimaciones en horas, dependencias y criterios de aceptación) está en **`DEVELOPMENT_PLAN.md`**. El checklist original por semanas se reemplaza por ese plan. Los ítems marcados como hechos en la versión Flutter (proyecto base, ThemeProvider, localización, widgets base) **no existen en este repositorio** y deben rehacerse en React.

### Resumen de fases (ver `DEVELOPMENT_PLAN.md`)
- [ ] Fase 0: Decisiones, hosting, Mercado Pago, apps OAuth, documentos legales, setup del repositorio
- [ ] Fase 1: Fundación backend, identidad (OAuth) y línea base de seguridad
- [ ] Fase 2: Fundación frontend, páginas públicas, admin y despliegue temprano
- [ ] Fase 3: Hub de herramientas gratuitas (calculadora de vuelo, conversor, METAR/TAF, velocidades) + SEO + primer despliegue a producción
- [ ] Fase 4: Billing y suscripciones (Mercado Pago, CLP)
- [ ] Fase 5: Espacio de educación (CMS, versionado, normativa DGAC)
- [ ] Fase 6: Evaluación (banco de preguntas y exámenes)
- [ ] Fase 7: Módulo de Aeronaves
- [ ] Fase 8: Módulo de Bitácora Personal + exportación a Excel
- [ ] Fase 9: Registro de vuelos, alertas y mantenimiento
- [ ] Fase 10: Cartas, E6B, planificación de vuelos y estimaciones
- [ ] Fase 11: Checklists (subidos e interactivos), configuración y reportes
- [ ] Fase 12: Privacidad, QA, hardening y despliegue en producción

## Métricas de Éxito

- **Usabilidad**: Interfaz intuitiva y fácil de usar para alumnos PPL
- **Aprendizaje**: Progreso por materia y tasa de aprobación en simulacros
- **Negocio**: Suscriptores activos y retención mensual
- **Performance**: Tiempo de respuesta < 1 segundo
- **Disponibilidad**: Calculadoras usables aun con conectividad pobre (todo en el navegador)
- **Precisión**: Cálculos precisos y confiables
- **Mantenibilidad**: Código limpio y bien documentado

## Control de Versiones

- **Repositorio**: GitHub
- **Branch principal**: `main`
- **Branch de desarrollo**: `develop`
- **Feature branches**: `feature/<nombre-funcionalidad>`
- **Hotfix branches**: `hotfix/<descripcion-bug>`

## Próximos Pasos

1. ✅ Crear repositorio en GitHub
2. ✅ Configurar estructura base del proyecto
3. Implementar backend + base de datos PostgreSQL 10.23
4. Desarrollar módulo de aeronaves
5. Desarrollar herramientas de cálculo
6. Iterar y mejorar continuamente

---

**Última actualización**: 20 de octubre de 2026
**Versión**: 2.0.0 - SaaS multiusuario para alumnos PPL (DGAC Chile, Mercado Pago) - React + Node.js 20/Express 5 + PostgreSQL 10.23
**Mantenido por**: Hernan Ricardo (@hrcastell)
