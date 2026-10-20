# Hernancius Aviation ✈️

<p align="center">
  <img src="assets/images/logo.png" alt="Hernancius Aviator Logo" width="200"/>
</p>

Plataforma SaaS para **aspirantes a piloto privado (alumnos PPL)**: educación, evaluación y herramientas operacionales en un solo lugar. Desarrollada con **React (Vite)** en el frontend y **Node.js 20 + Express 5 + PostgreSQL 10.23** en el backend, siguiendo arquitectura modular y principios SOLID.

## 🎨 Identidad Visual

**Hernancius Aviator** - El logo combina un casco espartano dorado con alas, simbolizando la fusión de fortaleza, disciplina y aviación. La corona de laurel representa la excelencia, y el avión en el centro simboliza la pasión por volar.

- **Colores principales**: Dorado/Beige (#B8985F)
- **Estilo**: Minimalista, elegante, profesional
- **Simbolismo**: Fortaleza + Aviación

Ver más: [Logo Information](assets/images/LOGO_INFO.md)

## 📋 Description

**Hernancius Aviation** es una plataforma **multiusuario por suscripción** para alumnos de piloto privado (PPL). Mercado de lanzamiento: **Chile**, con contenidos y exámenes basados en la normativa **DGAC Chile (DAN/DAR)**. El modelo está preparado para otras autoridades de Latinoamérica.

### Visión del producto
- **Espacio de educación**: cursos por materia teórica PPL (derecho aéreo, meteorología, navegación, principios de vuelo, conocimiento general de aeronaves, performance y planificación, factores humanos, comunicaciones, procedimientos operacionales). Estructura materia → módulos → lecciones (texto enriquecido, imágenes, PDFs, videos) y progreso por usuario. El contenido lo escribe el dueño de la plataforma (instructor de vuelo) desde un área de administración.
- **Evaluación**: banco de preguntas por materia, quizzes y simulacros completos con tiempo, puntaje automático ponderado, umbral de aprobación, historial y estadísticas por materia.
- **Herramientas operacionales**: vuelos y bitácora (rutas ICAO), aeronaves, cartas y meteorología, estimaciones de costo, planificación de vuelo, una calculadora de vuelo y conversor de unidades modernos, y checklists de la aeronave subidos por el usuario y usables en la app.
- **Herramientas gratuitas sin login** (canal de adquisición, indexables por buscadores): calculadora de vuelo, conversor de unidades, decodificador METAR/TAF y calculadora de velocidades (IAS → CAS → EAS → TAS → GS).
- **Suscripción mensual** de 5.000 CLP con **Mercado Pago** para todo lo demás (checkout alojado; los datos de tarjeta nunca pasan por nuestro servidor).
- **Login social** con Google y Facebook (sin contraseñas locales).
- **Seguridad y privacidad** transversales (Ley 19.628 / Ley 21.719 de Chile; a confirmar con asesoría legal).

## 🏗️ Architecture

The project follows a **modular architecture** with the following structure:

```
backend/                 # Node.js + Express 5 API (plain SQL via `pg`, no ORM)
├── migrations/          # Numbered, idempotent .sql files (001_init.sql, ...) applied on boot
├── src/
│   ├── config/          # env (dotenv), db pool, cors allowlist
│   ├── middleware/      # auth (JWT), error handler, validation
│   ├── modules/         # one folder per functional module (routes, controller, service, repository)
│   └── app.js / server.js
└── tests/

frontend/                # React (Vite) SPA
├── src/
│   ├── core/            # api client, auth context, theme, i18n, shared components
│   ├── modules/         # one folder per functional module (pages, components, hooks, api)
│   ├── i18n/            # en.json, es.json, pt.json
│   └── main.jsx
└── public/
```

Ver `DEVELOPMENT_PLAN.md` para la estructura completa.

### Key Principles

- **SOLID Principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Modular Design**: High cohesion within modules, low coupling between modules
- **Internationalization**: Support for English, Spanish, and Portuguese
- **Theme Management**: Centralized theme configuration (CSS variables + ThemeProvider de React)

## 🎨 Features

- **Multi-language Support**: English (en), Spanish (es), Portuguese (pt)
- **Theme Management**: Centralized color, font, and style configuration
- **Login social**: Google y Facebook (OAuth), sesión JWT en cookie httpOnly, sin contraseñas locales
- **Suscripción**: Mercado Pago (CLP), funciones gratuitas y pagadas
- **Educación y exámenes**: cursos DGAC Chile, banco de preguntas, simulacros
- **Flight Calculations**: Herramientas de cálculo de navegación y performance
- **Unit Converters**: Conversión de unidades (velocidad, altitud, combustible)
- **Flight Logbook**: Bitácora personal de horas de vuelo
- **Checklists**: Subidos por el usuario (PDF/imagen) o interactivos, con modo paso a paso
- **Aircraft Management**: Gestión de parámetros y documentación de aeronaves
- **Consistent UI**: Standard modal dialogs and notification system
- **Roboto Font**: Default typography across the application (ver conflicto Roboto vs Roboto Thin en `DEVELOPMENT_PLAN.md`)

## ✈️ Uso de la Aplicación

Esta aplicación está diseñada para:

- **Alumnos PPL**: estudiar las materias teóricas, practicar con quizzes y simulacros, y seguir su progreso
- **Pilotos en formación con aeronave propia o arrendada**: bitácora, aeronaves, checklists y planificación
- **Administrador de contenido** (dueño/instructor): crear cursos, lecciones y banco de preguntas
- **Calculadoras en el navegador**: los cálculos y conversiones no requieren llamadas al servidor

## 🚀 Getting Started

### Prerequisites

- Node.js 20 (el hosting cPanel ofrece 20.20.2)
- npm
- PostgreSQL 10.23 (local: Docker Compose con `postgres:10`)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/hrcastell/Hernancius-aviator.git
cd Hernancius-aviator
```

2. Start the local database:
```bash
docker compose up -d db
```

3. Install dependencies and run the backend (migrations run on boot):
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

4. Install dependencies and run the frontend:
```bash
cd frontend
npm install
npm run dev
```

## 📝 Development Rules

### Naming Conventions

- React components: `PascalCase.jsx` (ej. `AircraftList.jsx`, `UtcClock.jsx`)
- Hooks: `useSomething.js`
- Backend: `<module>.routes.js`, `<module>.controller.js`, `<module>.service.js`, `<module>.repository.js`
- Migrations: `NNN_description.sql`
- Files must be in their corresponding module folders

### UI Guidelines

1. **Always use the theme** (CSS variables / ThemeProvider) for colors, fonts, and styles
2. **Use i18n** for all text (no hardcoded strings)
3. **Use the shared `InfoModal` component** for all notifications and messages
4. **Default font**: Roboto
5. **Import theme tokens** in all UI components (no hardcoded colors)

### Data Management

1. **Server as source of truth**: All data is stored in PostgreSQL 10.23, scoped per user
2. **Authentication**: Google/Facebook OAuth only (no local passwords); JWT in httpOnly cookie + CSRF token
3. **Payments**: Mercado Pago hosted checkout + webhooks; card data never stored or proxied
4. **Persistence**: Plain SQL with the `pg` driver (no ORM), parameterized queries only
5. **Export Capability**: Support Excel export for flight logs

### Code Standards

- Follow SOLID principles
- Maintain modular architecture
- Pure-JavaScript npm packages only (no native modules) — required by shared hosting
- No PostgreSQL 11+ features (see `DATABASE_SCHEMA.md`)
- All UI components must support theme and localization
- Calculations must be precise and validated

## 🌍 Localization

Add new translations in:
- `frontend/src/i18n/en.json` (English)
- `frontend/src/i18n/es.json` (Spanish)
- `frontend/src/i18n/pt.json` (Portuguese)

Use in code:
```jsx
const { t } = useTranslation();
t('key');
```

## 🎨 Theming

Access theme properties:
```jsx
const theme = useTheme();
theme.colors.primary;
theme.fontFamily;
// or in CSS: var(--color-primary)
```

## 📦 Dependencies

**Backend** (pure JavaScript):
- `express` (v5) - HTTP server
- `pg` - PostgreSQL driver (plain SQL, no ORM)
- `jsonwebtoken` - JWT (session cookie)
- `passport`, `passport-google-oauth20`, `passport-facebook` - Social login
- `mercadopago` (only if pure JS) or plain HTTPS - Subscriptions
- `express-rate-limit`, `sanitize-html` - Security
- `helmet` - Security headers
- `cors` - CORS with allowlist
- `dotenv` - Environment configuration

**Frontend**:
- `react`, `react-dom` + `vite`
- Router, i18n, charts and Excel/PDF export libraries: see Decisions in `DEVELOPMENT_PLAN.md`

## 🤝 Contributing

1. Follow the established architecture and naming conventions
2. Ensure all UI uses the theme and localization
3. Test your changes thoroughly
4. Document new features

## 📄 License

This project is private and proprietary.

## 👤 Author

**Hernan Ricardo**
- GitHub: [@hrcastell](https://github.com/hrcastell)

---

Built with ❤️ using React, Node.js and PostgreSQL
