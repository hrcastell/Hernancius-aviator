# Hernancius Aviator - Development Plan

**Project code**: AVIATOR
**Version**: 2.2 (2026-10-20) - multi-user SaaS for PPL students; Chile (DGAC); Mercado Pago 5,000 CLP/month; Node 20; free public tools hub first
**Status**: Draft, pending answers to the open questions in section 9
**Machine-readable task list**: `Plans/hrcastell-import.json` (generated from the same data as this document)

---

## 1. App Goal and Summary

Hernancius Aviator is a **multi-user SaaS platform for aspiring pilots (private pilot / PPL students)**. It covers everything they need to learn and prepare:

- **Education**: ground-school courses for each PPL subject (subject -> modules -> lessons with rich text, images, PDFs and video links), with progress tracking for each user. An admin content-management area is used to author them.
- **Evaluation**: a question bank per subject, subject quizzes and full mock exams, timed attempts, automatic weighted scoring with pass thresholds, attempt history and performance stats per subject.
- **Free public tools (no login, SEO-indexable, the acquisition channel)**: flight calculator, unit converter, METAR/TAF decoder and a new airspeed calculator (IAS -> CAS -> EAS -> TAS -> GS). Each has a soft subscription CTA.
- **Paid operational tools**: flights and logbook (with full ICAO routes), aircraft, charts/weather map, cost estimates, flight planning, and aircraft checklists that users upload and run in the app.
- **Monthly subscription in CLP** paid by card through **Mercado Pago subscriptions (preapproval)** on its hosted checkout. Card data never touches our servers (PCI SAQ-A).
- **Social login** (Google, Facebook) with no local passwords.
- **Security and privacy** as a workstream that runs from Phase 0 to release, following Chile's Ley 19.628 and Ley 21.719 (to be confirmed with legal counsel).

**Market and regulatory basis**: the app launches in **Chile**. Content and exams follow **DGAC Chile DAN/DAR** (e.g. DAN 61 for private pilot licensing). Subjects, lessons and questions are tagged with an `authority` and a `regulation_reference` (e.g. "DAN 61 §61.105", with its version), so that a norm change flags the affected content for review. The model is ready for other Latin American authorities (Ecuador RDAC, Bolivia RAB, Peru RAP). FAA material is only a reference source, never the compliance basis.

**Content ownership**: the platform owner (a flight instructor) writes all lessons and questions. That authoring is owner work (ADMINISTRATIVE, 0 h in this estimate). The plan delivers solid authoring tools: a rich editor, media upload, CSV/JSON question import, draft/publish and versioning.

The original planning docs described an offline, single-user Flutter app. They were adapted first to the web stack (v1 of this plan) and now to the SaaS scope (v2). Task IDs from v1 are **unchanged**. New tasks start at AV-100.

**Current state of the repository**: static HTML/Tailwind/JS prototypes only. Phase 3 **ports and improves** the free tools (flightcal.html, conversion.html, js/weather-decoder.js decodeMetar, js/weather-api.js fetchMetar/fetchMetarHistory/analyzeMetarTrends) and ships them to production **before the paid area**. Phase 5 migrates the existing educational prototype content into courses.

**Plan size**: 13 phases, 141 tasks, **632.5 h** (593 h development, 39.5 h administrative). Writing the lessons and the question bank is owner work and is **not included**.

---

## 2. Stack and Constraints

| Layer | Choice | Constraints |
|-------|--------|-------------|
| Frontend | React (Vite), SPA | Pure-JS dependencies; responsive (desktop, tablet, phone) |
| Backend | Node.js **20 LTS** (cPanel provides 20.20.2) + **Express 5** | `engines: ">=20 <21"`; pure-JavaScript packages only (no native modules / node-gyp) |
| Data access | `pg` driver, **plain SQL**, no ORM | Parameterized queries only |
| Database | **PostgreSQL 10.23** | No PG11+ features: no generated columns, no `CREATE PROCEDURE`, no `MERGE`, no `EXECUTE FUNCTION` in triggers, no `CREATE OR REPLACE TRIGGER`, no `gen_random_uuid()` without pgcrypto |
| Migrations | Numbered idempotent `.sql` in `backend/migrations/` | Applied on boot, tracked in `schema_migrations`, advisory lock |
| Identity | OAuth 2.0 / OIDC: `passport` + `passport-google-oauth20` + `passport-facebook` | **No local passwords**; account linking only by verified email |
| Sessions | JWT (`jsonwebtoken`) in an **httpOnly Secure SameSite=Lax cookie**, jti stored in `user_session` for revocation | CSRF double-submit token on state-changing routes |
| Billing | Provider-agnostic module; **Mercado Pago** adapter: subscriptions (preapproval) + signed webhooks, CLP | Official `mercadopago` SDK only if pure JS, else plain HTTPS; no card data stored or proxied; Stripe/Flow.cl are possible future adapters |
| Security | `helmet` (CSP, HSTS), `cors` allowlist, `express-rate-limit`, `sanitize-html`, `dotenv` | Secrets only in env; audit log |
| Local dev | Docker Compose with `postgres:10` | Docker only for local development |
| Production | cPanel shared hosting, "Setup Node.js App" (Passenger) with **Node.js 20.20.2 (confirmed)**, no Docker | Still to confirm: PostgreSQL access and resource limits (AV-001); shared-hosting limits for a public SaaS (R12) |

`bcryptjs` is no longer needed, because there are no local passwords.

---

## 3. Architecture Overview

```
                    +--> Google / Facebook (OAuth redirect)
Browser (React SPA) |
   | HTTPS, httpOnly cookie + CSRF header
   v
Express 5 API (Passenger) --pg--> PostgreSQL 10.23
   |   ^
   |   +-- Mercado Pago webhooks (x-signature verified, idempotent)
   +-----> Mercado Pago hosted checkout (preapproval init_point; card data never reaches us)
   +-----> AVWX / OpenWeatherMap (server-side proxy, keys hidden)
```

- **Roles**: `student` (default on sign-up) and `admin` (content, question bank, users, subscriptions).
- **Entitlements**: every paid endpoint uses `requireEntitlement(feature)`, and the UI uses `useEntitlement`. Free vs paid comes from one config that matches the AV-102 matrix.
- Calculators and converters run **in the browser** as pure, tested JS functions.
- All user data is scoped by `user_id`. Admin routes live under `/api/v1/admin/*`.
- Express serves the built SPA from the same origin, so production needs no CORS and cookies stay first-party.

### Folder structure

```
Hernancius-aviator/
├── docker-compose.yml
├── legacy/                          # static prototypes until retired
├── Plans/
├── .github/workflows/               # CI: tests (postgres:10), audit, secret scan
├── backend/
│   ├── migrations/                  # 001_init.sql, 002_seed_catalogs.sql, 003_billing.sql,
│   │                                # 004_education.sql, 005_evaluation.sql, ...
│   ├── scripts/                     # make-admin.js, billing-reconcile.js, import-airports.js
│   ├── src/
│   │   ├── core/
│   │   │   ├── config/              # env.js, cors.js
│   │   │   ├── db/                  # pool.js, tx.js, migrate.js
│   │   │   ├── security/            # session.js (JWT cookie + jti), csrf.js, rbac.js,
│   │   │   │                        # rateLimit.js, entitlements.js, audit.js
│   │   │   ├── middleware/          # validate.js, errorHandler.js
│   │   │   └── utils/
│   │   ├── modules/
│   │   │   ├── auth/                # google, facebook, linking, me, logout
│   │   │   ├── billing/             # provider interface, mercadopago adapter, webhook, entitlements
│   │   │   ├── education/           # subjects, modules, lessons, assets, versions, progress (+ admin)
│   │   │   ├── regulations/         # authority, regulation_reference, norm-change review
│   │   │   ├── evaluation/          # questions, templates, attempts, scoring, stats (+ admin)
│   │   │   ├── files/               # secure upload service
│   │   │   ├── aircraft/
│   │   │   ├── logbook/
│   │   │   ├── flights/             # flight_log + plans
│   │   │   ├── alerts/
│   │   │   ├── checklists/
│   │   │   ├── reports/
│   │   │   ├── weather/
│   │   │   ├── privacy/             # account deletion, data export, legal acceptance
│   │   │   └── settings/
│   │   ├── app.js
│   │   └── server.js
│   └── tests/
└── frontend/
    ├── src/
    │   ├── core/                    # api, auth, theme, i18n, components, config, entitlements
    │   ├── shared/calc/             # units, performance, navigation, fuel, W&B, ICAO parser, scoring
    │   ├── public/                  # landing, pricing, legal pages
    │   ├── admin/                   # content editor, question bank, users, subscriptions
    │   ├── modules/                 # dashboard, education, exams, billing, aircraft, logbook,
    │   │                            # flights, planning, maintenance, tools, weather,
    │   │                            # checklists, reports, settings, account
    │   └── main.jsx
    └── package.json
```

---

## 4. Features and Functions

Legend: **PROTOTYPE** means a static HTML/JS version exists in the repo and is ported. **NEW** means it must be built. Paid/free follows the proposed matrix in AV-102 (to be confirmed).

| # | Feature | Functions | Status | Tier (proposed) | Tasks |
|---|---------|-----------|--------|-----------------|-------|
| F1 | Social sign-up/login | Google, Facebook, account linking, logout, revoke sessions | NEW | Free | AV-016, AV-110, AV-115, AV-024 |
| F2 | Roles and admin area | admin vs student, admin shell | NEW | - | AV-112, AV-017, AV-119 |
| F3 | Subscription billing (Mercado Pago, CLP) | Preapproval checkout, cancel, webhooks, trial, grace, entitlements | NEW | - | AV-103, AV-120..AV-127 |
| F4 | Education space | Subjects -> modules -> lessons, rich content, assets, progress | NEW (content partially in prototypes) | Paid | AV-130..AV-138, AV-036 |
| F5 | Content management (CMS) | Rich editor, media upload, draft/publish, versioning, ordering, CSV/JSON question import | NEW | Admin | AV-131..AV-134, AV-141, AV-172 |
| F5b | Regulation tagging (DGAC Chile) | Authority + regulation_reference on subjects/lessons/questions; norm-change review queue | NEW | Admin | AV-170, AV-171, AV-137 |
| F6 | Evaluation | Question bank, quizzes, mock exams, timer, weighted scoring, history, stats | NEW | Paid | AV-140..AV-149 |
| F7 | Public site | Landing, pricing, legal pages, SEO prerendering, sitemap | NEW (personal landing prototype exists) | Free | AV-118, AV-162, AV-183 |
| F7b | Free tools hub | No-login hub, shareable URLs, soft CTAs, early production release with legacy 301 redirects | NEW | **Free** | AV-182, AV-183, AV-185 |
| F8 | Dashboard | Logo, UTC/local clock, study progress, exam scores, alerts, flight stats | NEW | Paid (logged-in area) | AV-026, AV-063 |
| F9 | Unit converter | All roadmap unit categories | **PROTOTYPE** `conversion.html` | **Free** | AV-030 |
| F10 | Flight calculator | Takeoff/landing distance, climb, TAS/GS, level flight, charts | **PROTOTYPE** `flightcal.html`, `script.js` | **Free** | AV-031, AV-074 |
| F10b | Airspeed calculator | IAS -> CAS -> EAS -> TAS -> GS, pressure/density altitude, OAT, wind component (ISA, compressibility) | NEW | **Free** | AV-180, AV-181 |
| F11 | METAR/TAF decoder | Decoder (port + improve decodeMetar), TAF, station info, trends, favourites; backend proxy with cache and per-IP rate limit | **PROTOTYPE** `js/weather-decoder.js`, `js/weather-api.js`, `meteorologia.html` | **Free** | AV-032, AV-033 |
| F11b | Weather map / charts | Leaflet with OpenWeatherMap layers via proxy | **PROTOTYPE** `navegacion.html` | Paid | AV-034 |
| F12 | E6B / quick navigation | Wind triangle, TSD, fuel burn, TAS | **PROTOTYPE** (route calculator in `navegacion.html`) | Paid | AV-035 |
| F13 | Aircraft and maintenance | Catalogue, user aircraft, maintenance log, documents | NEW | Paid | AV-040..AV-046, AV-064 |
| F14 | Pilot profile and logbook | Profile, licences, logbook with ICAO routes, Excel export | NEW | Paid | AV-050..AV-056 |
| F15 | Flight records and alerts | Flight log with automatic totals, expiry/maintenance alerts | NEW | Paid | AV-060..AV-062 |
| F16 | Flight planning and estimates | Route editor, navigation, fuel, W&B, performance, costs, NavLog, plan vs actual | NEW | Paid | AV-070..AV-079 |
| F17 | Checklists | Upload PDF/image, interactive builder, step-through cockpit mode | NEW (static SOP content in prototype) | Paid | AV-083, AV-084, AV-150, AV-151 |
| F18 | Settings and reports | Preferences, units, module manager, statistics, exports | NEW | Paid | AV-080..AV-082, AV-085..AV-087 |
| F19 | Privacy and compliance (Ley 19.628 / 21.719) | Terms acceptance, consent records, data subject rights, deletion, export, breach procedure, audit log | NEW | Free | AV-088, AV-114, AV-160..AV-162, AV-174..AV-176 |
| F20 | Security baseline | CSRF, rate limits, CSP/HSTS, uploads, secrets, CI scanning, monitoring | NEW | - | AV-106, AV-111, AV-113, AV-116, AV-117, AV-043, AV-163, AV-092 |
| F21 | Twitch integration | Live status and clips | **PROTOTYPE** `index.html`, `js/twitch-api.js` | - | Backlog |

---

## 5. Phases and Milestones

Phases run in this order. Inside a phase, tasks can run in parallel when their dependencies allow it. Security tasks are built into Phase 0/1 (baseline), not added at the end.

| Phase | Name | Tasks | Dev (h) | Admin (h) | Total (h) |
|-------|------|------:|--------:|----------:|----------:|
| P0 | Inception, Decisions and Repository Setup | 15 | 7.5 | 30.5 | **38** |
| P1 | Backend Foundation, Identity and Security Baseline | 19 | 62.5 | 0 | **62.5** |
| P2 | Frontend Foundation, Public Pages and Walking Skeleton | 16 | 56 | 0 | **56** |
| P3 | Free Public Tools Hub (Acquisition Channel) and First Production Release | 9 | 57 | 0 | **57** |
| P4 | Billing and Subscriptions | 8 | 35 | 0 | **35** |
| P5 | Education Space | 12 | 60 | 0 | **60** |
| P6 | Evaluation (Question Bank and Exams) | 10 | 59 | 0 | **59** |
| P7 | Aircraft Module | 6 | 31 | 0 | **31** |
| P8 | Personal Logbook Module | 7 | 36 | 0 | **36** |
| P9 | Flight Records, Alerts and Maintenance | 5 | 33 | 0 | **33** |
| P10 | Charts, Flight Planning and Estimates | 12 | 69 | 0 | **69** |
| P11 | Checklists, Settings and Reports | 10 | 48 | 0 | **48** |
| P12 | Privacy, QA, Hardening and Production Release | 12 | 39 | 9 | **48** |
| | **Total** | **141** | **593** | **39.5** | **632.5** |

| Milestone | Reached after | Meaning |
|-----------|---------------|---------|
| M0 - Ready to build | P0 | Hosting, DGAC syllabus, Mercado Pago, legal drafts and OAuth apps settled |
| M1 - Secure walking skeleton | P1 + P2 | Google/Facebook sign-in on the real host, with cookies, CSRF, RBAC, audit log and CI |
| M2 - **Free tools live** | P3 | Flight calculator, converter, METAR/TAF and airspeed calculator in production, SEO-indexed, legacy URLs redirected (acquisition channel) |
| M3 - Monetisable | P4 | Users can subscribe in CLP through Mercado Pago; entitlements gate paid features |
| M4 - Learning MVP | P5 + P6 | DGAC-tagged courses and exams usable by paying students (needs owner content, AV-138/AV-149) |
| M5 - Operations MVP | P7 + P8 + P9 | Aircraft, logbook, flights, alerts, dashboard |
| M6 - Planning | P10 | Charts, E6B, full flight planning with estimates and NavLog |
| M7 - Full production release | P11 + P12 | Checklists, settings, reports, privacy features, hardening, backups |

**About the estimates**: they assume one developer who knows the stack. They do not include contingency, owner content authoring, legal counsel fees or Mercado Pago fees. Add a **25% buffer** for planning.

---

## 6. Task Details by Phase

Every task has an ID, title, description, category (DEVELOPMENT or ADMINISTRATIVE), estimate in hours, dependencies and acceptance criteria.

### Phase 0: Inception, Decisions and Repository Setup

**Goal**: Confirm hosting, choose the country/authority, pricing, payment provider and legal base, register OAuth apps, secure exposed credentials and prepare the monorepo.

**Phase estimate**: 38 h (7.5 h development, 30.5 h administrative)

| ID | Title | Category | Est. (h) | Depends on |
|----|-------|----------|---------:|------------|
| AV-001 | Confirm hosting environment (Node 20 confirmed) | ADMINISTRATIVE | 1.5 | - |
| AV-100 | Map the DGAC Chile PPL syllabus and exam format (DAN/DAR) | ADMINISTRATIVE | 3 | - |
| AV-002 | Close open product decisions | ADMINISTRATIVE | 3 | - |
| AV-101 | Owner content and question bank authoring plan | ADMINISTRATIVE | 3 | AV-100 |
| AV-102 | Trial and grace period decision | ADMINISTRATIVE | 1 | AV-100 |
| AV-103 | Mercado Pago setup (subscriptions, sandbox, webhooks) | ADMINISTRATIVE | 3 | AV-102 |
| AV-105 | Legal documents under Chilean law (confirm with legal counsel) | ADMINISTRATIVE | 6 | AV-100 |
| AV-104 | Register Google and Facebook OAuth apps | ADMINISTRATIVE | 3 | AV-105 |
| AV-003 | Rotate exposed API credentials | ADMINISTRATIVE | 1 | - |
| AV-004 | Register external data/API accounts | ADMINISTRATIVE | 1 | AV-003 |
| AV-005 | Prepare logo and icon assets | ADMINISTRATIVE | 2 | - |
| AV-006 | Restructure repository as monorepo | DEVELOPMENT | 2 | AV-002 |
| AV-007 | Local PostgreSQL 10 with Docker Compose | DEVELOPMENT | 1.5 | AV-006 |
| AV-106 | Threat model and data inventory | DEVELOPMENT | 4 | AV-002 |
| AV-175 | Personal data breach response procedure (confirm with legal counsel) | ADMINISTRATIVE | 3 | AV-105, AV-106 |

#### AV-001 - Confirm hosting environment (Node 20 confirmed)
- **Category**: ADMINISTRATIVE
- **Estimate**: 1.5 h
- **Depends on**: none
- **Description**: Node.js on cPanel is confirmed as 20.20.2, so the target is Node 20 LTS (package.json engines '>=20 <21'). Still to verify: Setup Node.js App (Passenger) behaviour, PostgreSQL 10.23 access, SSL, subdomain/path, SSH, cron, and resource limits for a public multi-user SaaS.
- **Acceptance criteria**:
  - [ ] Written note covers PostgreSQL version, SSL, SSH/cron and resource limits
  - [ ] Both package.json files declare engines node '>=20 <21'
  - [ ] A test DB and DB user exist in cPanel

#### AV-100 - Map the DGAC Chile PPL syllabus and exam format (DAN/DAR)
- **Category**: ADMINISTRATIVE
- **Estimate**: 3 h
- **Depends on**: none
- **Description**: The launch market is Chile and the regulatory basis is DGAC Chile (DAN/DAR, e.g. the private pilot licensing norm DAN 61). The owner documents the PPL ground-school subjects, exam format (questions, duration, pass mark, per-subject rules) and the norm references with their versions. FAA material is used only as a reference source, never as the compliance basis. Future markets (Ecuador RDAC, Bolivia RAB, Peru RAP...) must fit the same authority model.
- **Acceptance criteria**:
  - [ ] The DGAC Chile subjects list and exam rules are recorded with DAN/DAR references and versions
  - [ ] Exam rules are documented for AV-143/AV-145
  - [ ] The list of future authorities is recorded for the authority model (AV-170)

#### AV-002 - Close open product decisions
- **Category**: ADMINISTRATIVE
- **Estimate**: 3 h
- **Depends on**: none
- **Description**: Close the remaining product decisions: Roboto vs Roboto Thin, colour palette, keep or drop the reserved sync columns, airport data source, and whether the public landing/Twitch content stays. Multi-user public sign-up and cookie-based sessions are already decided.
- **Acceptance criteria**:
  - [ ] Every open question in section 9 that is marked for AV-002 has an answer recorded in the Decisions section
  - [ ] Scope changes are reflected in the task list before Phase 1 starts

#### AV-101 - Owner content and question bank authoring plan
- **Category**: ADMINISTRATIVE
- **Estimate**: 3 h
- **Depends on**: AV-100
- **Description**: The platform owner (a flight instructor) authors all lessons and questions. Agree the authoring schedule per subject and the minimum content for launch. Authoring is owner work and is not included in development hours.
- **Acceptance criteria**:
  - [ ] Authoring schedule per subject agreed
  - [ ] Launch minimum per subject (modules, questions) defined

#### AV-102 - Trial and grace period decision
- **Category**: ADMINISTRATIVE
- **Estimate**: 1 h
- **Depends on**: AV-100
- **Description**: Price (5,000 CLP/month, single plan) and the free vs paid matrix are decided. FREE, no login: flight calculator, unit converter, METAR/TAF decoder, airspeed calculator. PAID: everything else. Still open: whether to offer a free trial and how long, and the past_due grace days.
- **Acceptance criteria**:
  - [ ] Trial yes/no (and length) recorded
  - [ ] Grace days recorded

#### AV-103 - Mercado Pago setup (subscriptions, sandbox, webhooks)
- **Category**: ADMINISTRATIVE
- **Estimate**: 3 h
- **Depends on**: AV-102
- **Description**: Decided: Mercado Pago (the owner already has an account), using subscriptions (preapproval) in CLP. Generate test and production credentials, create sandbox test users (buyer and seller), and create the preapproval plan(s) in CLP. Configure the webhook URL and secret signature for x-signature validation. Confirm SII invoicing (boleta) obligations. Check whether the official `mercadopago` npm SDK is pure JS; if it is not, use plain HTTPS calls.
- **Acceptance criteria**:
  - [ ] Test and production credentials are stored in the password manager
  - [ ] Sandbox buyer/seller test users exist
  - [ ] A CLP preapproval plan exists in sandbox
  - [ ] Webhook URL and signature secret are configured; SDK purity check recorded
  - [ ] SII invoicing obligation documented

#### AV-105 - Legal documents under Chilean law (confirm with legal counsel)
- **Category**: ADMINISTRATIVE
- **Estimate**: 6 h
- **Depends on**: AV-100
- **Description**: Draft the Terms of Service, Privacy Policy and cookie notice under Ley 19.628 and the new Ley 21.719 (personal data protection and the new data protection agency). Cover legal bases and consent, data categories, retention, processors (Google, Meta, payment provider, hosting), international transfers, data subject rights (access, rectification, deletion, opposition, portability) and the breach notification duty. Must be confirmed with legal counsel.
- **Acceptance criteria**:
  - [ ] Versioned documents in Spanish exist
  - [ ] Processors, international transfers and retention are listed
  - [ ] Reviewed and approved by legal counsel

#### AV-104 - Register Google and Facebook OAuth apps
- **Category**: ADMINISTRATIVE
- **Estimate**: 3 h
- **Depends on**: AV-105
- **Description**: Create the Google Cloud OAuth client (consent screen, scopes openid/email/profile) and the Meta app (Facebook Login, email permission). Set the redirect URIs for local and production, the privacy policy and terms URLs, and plan for Facebook app review.
- **Acceptance criteria**:
  - [ ] Client IDs and secrets exist for dev and production in the password manager
  - [ ] Consent screens show app name, logo, privacy policy and terms
  - [ ] Facebook app review requirements are listed with a submission date

#### AV-003 - Rotate exposed API credentials
- **Category**: ADMINISTRATIVE
- **Estimate**: 1 h
- **Depends on**: none
- **Description**: The static prototype commits an OpenWeatherMap API key in js/config.js and a Twitch client id/token flow in js/twitch-api.js. Rotate/revoke the keys and plan to keep secrets only in backend .env files.
- **Acceptance criteria**:
  - [ ] Old OpenWeatherMap key is revoked and a new one is issued
  - [ ] No API key remains in any file served to the browser
  - [ ] Secrets are documented as backend-only environment variables

#### AV-004 - Register external data/API accounts
- **Category**: ADMINISTRATIVE
- **Estimate**: 1 h
- **Depends on**: AV-003
- **Description**: Get the AVWX token (METAR/TAF) and confirm its plan limits. Confirm OpenWeatherMap tile usage limits and the OurAirports licence for importing airport data.
- **Acceptance criteria**:
  - [ ] AVWX and OpenWeatherMap credentials are stored in a password manager
  - [ ] Rate limits / quotas of each API are recorded in the plan risks

#### AV-005 - Prepare logo and icon assets
- **Category**: ADMINISTRATIVE
- **Estimate**: 2 h
- **Depends on**: none
- **Description**: Provide logo.png (1024x1024), logo_icon.png, logo_white.png for dark mode, favicon and PWA-size icons (192/512). The logo file referenced by the docs is not in the repository yet.
- **Acceptance criteria**:
  - [ ] All logo variants exist in frontend/public or an assets folder
  - [ ] Favicon renders in Chrome and Safari

#### AV-006 - Restructure repository as monorepo
- **Category**: DEVELOPMENT
- **Estimate**: 2 h
- **Depends on**: AV-002
- **Description**: Create backend/ and frontend/ folders, move static prototypes (index.html, flightcal.html, conversion.html, meteorologia.html, navegacion.html, procedimientos.html, script.js, js/, css/) into legacy/ for reference, add root .gitignore (.env, node_modules, uploads), .editorconfig and root README.
- **Acceptance criteria**:
  - [ ] Repository has backend/, frontend/ and legacy/ folders
  - [ ] .env and node_modules are ignored by git
  - [ ] Legacy pages still open locally from legacy/

#### AV-007 - Local PostgreSQL 10 with Docker Compose
- **Category**: DEVELOPMENT
- **Estimate**: 1.5 h
- **Depends on**: AV-006
- **Description**: docker-compose.yml with postgres:10 (pinned to 10.23 if that tag exists), a named volume and a healthcheck. backend/.env.example documents DATABASE_URL, JWT_SECRET, CSRF_SECRET, CORS_ORIGINS, APP_BASE_URL, GOOGLE_CLIENT_ID/SECRET, FACEBOOK_APP_ID/SECRET, MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, AVWX_TOKEN, OWM_API_KEY and UPLOAD_DIR.
- **Acceptance criteria**:
  - [ ] docker compose up starts PostgreSQL 10.x and SELECT version() reports 10.x
  - [ ] .env.example lists every variable the backend reads

#### AV-106 - Threat model and data inventory
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-002
- **Description**: STRIDE-style threat model for auth, billing webhooks, uploads, exams and admin. Data inventory with classification, minimisation decisions (store only name, email, avatar, provider id) and a retention table.
- **Acceptance criteria**:
  - [ ] The threat model lists threats with a mitigating task ID for each
  - [ ] The data inventory lists every personal-data column and its retention
  - [ ] No card data or passwords appear in the inventory

#### AV-175 - Personal data breach response procedure (confirm with legal counsel)
- **Category**: ADMINISTRATIVE
- **Estimate**: 3 h
- **Depends on**: AV-105, AV-106
- **Description**: Written procedure: detection, containment, assessment, notification to the Chilean data protection agency and affected users within the legal deadline under Ley 21.719, and a register of incidents.
- **Acceptance criteria**:
  - [ ] Procedure document approved by legal counsel
  - [ ] Incident register template exists
  - [ ] Contacts and notification templates prepared

---

### Phase 1: Backend Foundation, Identity and Security Baseline

**Goal**: Express 5 API, plain-SQL data layer, boot-time migrations, OAuth sign-in with cookie sessions, RBAC, CSRF, rate limits, audit log, uploads and CI.

**Phase estimate**: 62.5 h (62.5 h development, 0 h administrative)

| ID | Title | Category | Est. (h) | Depends on |
|----|-------|----------|---------:|------------|
| AV-010 | Express 5 application skeleton | DEVELOPMENT | 3 | AV-006 |
| AV-011 | Environment configuration loader | DEVELOPMENT | 1 | AV-010 |
| AV-116 | Secrets management and transport security | DEVELOPMENT | 2 | AV-011 |
| AV-012 | PostgreSQL pool and transaction helper | DEVELOPMENT | 2 | AV-011, AV-007 |
| AV-013 | Boot-time migration runner | DEVELOPMENT | 4 | AV-012 |
| AV-014 | Migration 001: core schema (PG 10) | DEVELOPMENT | 4 | AV-013 |
| AV-015 | Migration 002: seed catalogs | DEVELOPMENT | 3 | AV-014 |
| AV-110 | Session tokens, cookies and revocation | DEVELOPMENT | 4 | AV-014, AV-011 |
| AV-016 | Google OAuth login with JWT session cookie | DEVELOPMENT | 8 | AV-014, AV-110 |
| AV-115 | Facebook login and account linking | DEVELOPMENT | 4 | AV-016 |
| AV-114 | Audit log | DEVELOPMENT | 4 | AV-014 |
| AV-017 | Admin role bootstrap script | DEVELOPMENT | 1.5 | AV-016, AV-114 |
| AV-111 | CSRF protection | DEVELOPMENT | 3 | AV-110 |
| AV-112 | Role-based access control (admin vs student) | DEVELOPMENT | 3 | AV-016 |
| AV-113 | Rate limiting and request limits | DEVELOPMENT | 2 | AV-010 |
| AV-018 | API conventions: validation, errors, pagination, locking | DEVELOPMENT | 3 | AV-010 |
| AV-043 | Secure file upload service | DEVELOPMENT | 5 | AV-018, AV-014, AV-114 |
| AV-163 | Logging and monitoring without personal data | DEVELOPMENT | 3 | AV-010 |
| AV-019 | Backend test harness | DEVELOPMENT | 3 | AV-013 |

#### AV-010 - Express 5 application skeleton
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-006
- **Description**: backend/src/app.js and server.js: helmet, cors with allowlist from CORS_ORIGINS, JSON body limit, GET /api/v1/health, 404 handler and central error handler. Pure-JavaScript dependencies only.
- **Acceptance criteria**:
  - [ ] GET /api/v1/health returns 200 with {status:'ok'}
  - [ ] A request from an origin outside the allowlist receives no CORS headers
  - [ ] helmet security headers are present on responses
  - [ ] npm ls shows no native (node-gyp) modules

#### AV-011 - Environment configuration loader
- **Category**: DEVELOPMENT
- **Estimate**: 1 h
- **Depends on**: AV-010
- **Description**: dotenv-based config module that validates required variables at startup and fails fast with a clear message.
- **Acceptance criteria**:
  - [ ] Starting without JWT_SECRET or DATABASE_URL exits with a descriptive error
  - [ ] Config is read from one module only (no process.env scattered in code)

#### AV-116 - Secrets management and transport security
- **Category**: DEVELOPMENT
- **Estimate**: 2 h
- **Depends on**: AV-011
- **Description**: All secrets only in cPanel environment variables or .env (never committed). Fail fast when any is missing. HTTPS redirect, HSTS, secure cookie flags in production, and a secret-scanning pre-commit hook (e.g. gitleaks via CI).
- **Acceptance criteria**:
  - [ ] The app refuses to start in production without HTTPS-related config
  - [ ] Secret scanning runs in CI and fails on a planted test secret

#### AV-012 - PostgreSQL pool and transaction helper
- **Category**: DEVELOPMENT
- **Estimate**: 2 h
- **Depends on**: AV-011, AV-007
- **Description**: pg Pool (small max for shared hosting), query helper, withTx(fn) helper (BEGIN/COMMIT/ROLLBACK with one client), app-generated UUID helper (crypto.randomUUID).
- **Acceptance criteria**:
  - [ ] withTx rolls back when the callback throws (covered by a test)
  - [ ] Pool size is configurable via env
  - [ ] All queries use parameter placeholders ($1, $2...)

#### AV-013 - Boot-time migration runner
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-012
- **Description**: Applies backend/migrations/NNN_*.sql in numeric order on boot, one transaction per file, records version + SHA-256 checksum in schema_migrations, guarded by pg_advisory_lock so concurrent Passenger workers cannot run migrations twice; checksum mismatch of an applied file aborts boot.
- **Acceptance criteria**:
  - [ ] Fresh DB: all migrations apply and are listed in schema_migrations
  - [ ] Second boot applies nothing and starts normally
  - [ ] Two processes started at once apply each migration exactly once
  - [ ] Editing an applied migration file makes boot fail with a checksum error

#### AV-014 - Migration 001: core schema (PG 10)
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-013
- **Description**: Create app_user (no password column), oauth_identity, user_session, audit_log, stored_file, legal_acceptance and the 10 domain tables exactly as in DATABASE_SCHEMA.md, plus indexes. Use only PG10-compatible, idempotent SQL (IF NOT EXISTS, CHECK constraints, FK creation order).
- **Acceptance criteria**:
  - [ ] Migration runs cleanly on postgres:10
  - [ ] Re-running the SQL file manually causes no error
  - [ ] No PG11+ syntax (generated columns, CREATE PROCEDURE, MERGE, EXECUTE FUNCTION, gen_random_uuid)

#### AV-015 - Migration 002: seed catalogs
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-014
- **Description**: Idempotent seed of aircraft_manufacturer, aircraft_model (C172, C182, PA-28, SR22, DA40...) and default checklist_template rows with fixed UUID literals and ON CONFLICT DO NOTHING. Model figures sourced from POH data.
- **Acceptance criteria**:
  - [ ] Seed applies twice without duplicates
  - [ ] At least 6 manufacturers and 6 models with cruise speed, fuel and weight data
  - [ ] Each seeded model figure lists its source in a SQL comment

#### AV-110 - Session tokens, cookies and revocation
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-014, AV-011
- **Description**: JWT (jsonwebtoken) signed with JWT_SECRET, short expiry with sliding refresh, delivered only as an httpOnly Secure SameSite=Lax cookie. Each token's jti is stored in user_session for logout, revoke-all and account-deletion invalidation. Express trust proxy is set for Passenger.
- **Acceptance criteria**:
  - [ ] Tokens are never exposed to JavaScript or in URLs
  - [ ] A revoked jti is rejected on the next request
  - [ ] Revoke-all-sessions works (test)

#### AV-016 - Google OAuth login with JWT session cookie
- **Category**: DEVELOPMENT
- **Estimate**: 8 h
- **Depends on**: AV-014, AV-110
- **Description**: Google sign-in (OIDC) with passport + passport-google-oauth20 (session: false), state/nonce kept in a short-lived signed cookie. First login creates app_user (role student) and oauth_identity. Issue a short-lived JWT in an httpOnly Secure SameSite=Lax cookie, with its jti stored in user_session so it can be revoked. GET /api/v1/auth/me and POST /api/v1/auth/logout. No local passwords.
- **Acceptance criteria**:
  - [ ] A new Google user can sign up and log in, and gets the student role
  - [ ] The session cookie is httpOnly, Secure and SameSite=Lax; no token is readable from JavaScript
  - [ ] Logout or revocation invalidates the session server-side (jti check)
  - [ ] The OAuth state parameter is validated; a tampered callback returns 400
  - [ ] No password is stored anywhere

#### AV-115 - Facebook login and account linking
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-016
- **Description**: passport-facebook strategy. Link a new provider to an existing account only when both emails are verified (Google email_verified; Facebook accounts without a returned email are treated as unverified). A logged-in user can link or unlink providers, but cannot remove the last one.
- **Acceptance criteria**:
  - [ ] A Facebook user can sign up and log in
  - [ ] The same verified email via Google and Facebook resolves to one account
  - [ ] An unverified or missing email never auto-links; the user is asked to sign in with the existing provider first
  - [ ] The last provider cannot be unlinked

#### AV-114 - Audit log
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-014
- **Description**: audit_log writer used for sign-in, sign-out, role changes, account deletion/export, subscription changes, content publish/unpublish and file deletion. Stores actor, action, target, IP hash and timestamp, with no sensitive payloads.
- **Acceptance criteria**:
  - [ ] Each listed action produces exactly one audit row (tests)
  - [ ] Rows contain no tokens or card data
  - [ ] Admins can query the log by user and date

#### AV-017 - Admin role bootstrap script
- **Category**: DEVELOPMENT
- **Estimate**: 1.5 h
- **Depends on**: AV-016, AV-114
- **Description**: npm run make-admin <email> CLI that promotes an existing user to admin and writes an audit_log entry. There is no public way to become an admin.
- **Acceptance criteria**:
  - [ ] The script promotes an existing user and logs the change in audit_log
  - [ ] An unknown email fails without changing any data

#### AV-111 - CSRF protection
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-110
- **Description**: Double-submit CSRF token (signed cookie + X-CSRF-Token header) required on all state-changing routes, plus an Origin/Referer check. The Mercado Pago webhook route is excluded and protected by signature instead.
- **Acceptance criteria**:
  - [ ] POST/PUT/PATCH/DELETE without a valid token return 403
  - [ ] A cross-origin form post is rejected (test)
  - [ ] The webhook route still accepts signed provider events

#### AV-112 - Role-based access control (admin vs student)
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-016
- **Description**: requireRole middleware and role checks for admin endpoints (content, question bank, billing admin). Role changes are audited.
- **Acceptance criteria**:
  - [ ] Students get 403 on every /api/v1/admin/* route (test)
  - [ ] Role changes create audit_log entries

#### AV-113 - Rate limiting and request limits
- **Category**: DEVELOPMENT
- **Estimate**: 2 h
- **Depends on**: AV-010
- **Description**: express-rate-limit (pure JS, in-memory store sized for one host) on auth, uploads, exam submission and webhooks. JSON body size limits and request timeouts.
- **Acceptance criteria**:
  - [ ] Exceeding a limit returns 429 with Retry-After
  - [ ] Limits are configurable via env

#### AV-018 - API conventions: validation, errors, pagination, locking
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-010
- **Description**: Request validation helper, uniform error JSON {error:{code,message,details}}, pagination params, 409 Conflict on optimistic-lock version mismatch, soft-delete helpers, and a user_id scoping helper that every repository must use.
- **Acceptance criteria**:
  - [ ] Invalid payloads return 400 with field details
  - [ ] Stale version update returns 409
  - [ ] Documented in backend/README.md

#### AV-043 - Secure file upload service
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-018, AV-014, AV-114
- **Description**: Shared upload service: pure-JS multipart (busboy/multer), MIME sniffing plus an extension allowlist (PDF, PNG, JPEG, WebP), size limits per purpose, random file names stored outside the public web root, a stored_file row with owner and SHA-256, and an authenticated, owner-checked download endpoint. Used by checklists, lesson assets, licence scans, aircraft photos and maintenance documents.
- **Acceptance criteria**:
  - [ ] Files over the limit, or with a disallowed type or a spoofed extension, are rejected
  - [ ] Files cannot be downloaded without authentication or by another user (except published lesson assets)
  - [ ] The upload directory is outside the web root and excluded from git
  - [ ] Upload and delete actions are written to audit_log

#### AV-163 - Logging and monitoring without personal data
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-010
- **Description**: Structured logs with request id and no tokens, emails or IPs in clear text. Error alerting (email or uptime monitor) and log rotation within the hosting limits.
- **Acceptance criteria**:
  - [ ] A log review finds no secrets or personal data
  - [ ] A forced 500 triggers an alert

#### AV-019 - Backend test harness
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-013
- **Description**: node:test (or another pure-JS runner) + supertest against a disposable PostgreSQL 10 test database; migrations run before tests; npm test script.
- **Acceptance criteria**:
  - [ ] npm test runs green locally against postgres:10
  - [ ] Tests isolate data (truncate or transaction rollback between tests)

---

### Phase 2: Frontend Foundation, Public Pages and Walking Skeleton

**Goal**: React shell with theme, i18n, social login, shared components, public landing/pricing, admin shell, legal pages and an early deployment to the real host.

**Phase estimate**: 56 h (56 h development, 0 h administrative)

| ID | Title | Category | Est. (h) | Depends on |
|----|-------|----------|---------:|------------|
| AV-020 | Vite + React scaffold | DEVELOPMENT | 2 | AV-006 |
| AV-021 | Routing and responsive layout shell | DEVELOPMENT | 4 | AV-020 |
| AV-022 | Theme system (light/dark/auto + aviation colours) | DEVELOPMENT | 4 | AV-021, AV-002 |
| AV-023 | Internationalisation es/en/pt | DEVELOPMENT | 3 | AV-020 |
| AV-024 | Social login UI, auth context and API client | DEVELOPMENT | 5 | AV-016, AV-115, AV-021 |
| AV-025 | Shared UI components | DEVELOPMENT | 5 | AV-022 |
| AV-026 | UtcClock component | DEVELOPMENT | 2 | AV-025 |
| AV-027 | Module registry and feature toggles | DEVELOPMENT | 3 | AV-021 |
| AV-028 | Frontend test setup | DEVELOPMENT | 2 | AV-020 |
| AV-117 | CI pipeline with tests and dependency scanning | DEVELOPMENT | 4 | AV-019, AV-028 |
| AV-118 | Public landing, pricing and sign-up pages | DEVELOPMENT | 6 | AV-022, AV-023 |
| AV-119 | Admin area shell | DEVELOPMENT | 4 | AV-024, AV-112 |
| AV-162 | Legal pages and consent versioning | DEVELOPMENT | 3 | AV-105, AV-014 |
| AV-176 | Consent records | DEVELOPMENT | 3 | AV-162 |
| AV-088 | Legal disclaimer and terms acceptance | DEVELOPMENT | 2 | AV-024, AV-162 |
| AV-029 | Walking-skeleton deployment to cPanel | DEVELOPMENT | 4 | AV-001, AV-024, AV-013 |

#### AV-020 - Vite + React scaffold
- **Category**: DEVELOPMENT
- **Estimate**: 2 h
- **Depends on**: AV-006
- **Description**: frontend/ created with Vite React template, ESLint/Prettier, VITE_API_URL, dev proxy to the backend.
- **Acceptance criteria**:
  - [ ] npm run dev serves the app and proxies /api to the backend
  - [ ] npm run build produces a dist/ folder without warnings

#### AV-021 - Routing and responsive layout shell
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-020
- **Description**: react-router routes, AppBar with logo, collapsible side navigation, breakpoints compact <600px / medium 600-840px / expanded >840px.
- **Acceptance criteria**:
  - [ ] Navigation works on 375px, 768px and 1280px widths with no horizontal scroll
  - [ ] Unknown routes show a not-found page

#### AV-022 - Theme system (light/dark/auto + aviation colours)
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-021, AV-002
- **Description**: CSS variable tokens from the ROADMAP palette (or the palette chosen in AV-002), VFR/MVFR/IFR/LIFR colours, ThemeProvider, auto mode via prefers-color-scheme. Replaces the prototype toggleTheme().
- **Acceptance criteria**:
  - [ ] Switching theme updates all components without reload
  - [ ] Auto mode follows the OS setting
  - [ ] No hard-coded colours in components (lint or review check)

#### AV-023 - Internationalisation es/en/pt
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-020
- **Description**: i18next + react-i18next, JSON resources, browser language detection, manual selector; Spanish default.
- **Acceptance criteria**:
  - [ ] All shell texts come from translation files
  - [ ] Changing language updates the UI immediately
  - [ ] Missing keys are reported in development

#### AV-024 - Social login UI, auth context and API client
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-016, AV-115, AV-021
- **Description**: Login/sign-up page with Google and Facebook buttons. API client sends cookies (credentials: 'include') and the CSRF header. AuthContext loads /auth/me, ProtectedRoute and role-aware routes, automatic logout on 401.
- **Acceptance criteria**:
  - [ ] Unauthenticated users are redirected to /login
  - [ ] After sign-in, the user lands on the dashboard (new users go through terms acceptance)
  - [ ] An expired session redirects to login with a message
  - [ ] Every state-changing request sends the CSRF token

#### AV-025 - Shared UI components
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-022
- **Description**: InfoModal (standard notification/message modal), Card, Button, Input, Select, NumberWithUnit field, Table, loading and empty states.
- **Acceptance criteria**:
  - [ ] Components support light/dark themes and keyboard focus states
  - [ ] InfoModal is used for all user notifications
  - [ ] Each component has at least one render test

#### AV-026 - UtcClock component
- **Category**: DEVELOPMENT
- **Estimate**: 2 h
- **Depends on**: AV-025
- **Description**: Dual clock: UTC 'HH:MM:SS Z' and local time with offset (e.g. '20:45:30 -03:00'), updated every second.
- **Acceptance criteria**:
  - [ ] Shows correct UTC and local time with offset
  - [ ] Updates every second without layout shift
  - [ ] Unit test covers formatting with a fixed date

#### AV-027 - Module registry and feature toggles
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-021
- **Description**: moduleRegistry with id, icon, isCore, dependsOn and lazy route loading; navigation shows only enabled modules; dependency validation (flight_planning needs aircraft+logbook, maintenance needs aircraft, reports needs logbook+aircraft).
- **Acceptance criteria**:
  - [ ] Disabling a module hides its navigation and routes
  - [ ] A module cannot be disabled while an enabled module depends on it
  - [ ] Settings module cannot be disabled

#### AV-028 - Frontend test setup
- **Category**: DEVELOPMENT
- **Estimate**: 2 h
- **Depends on**: AV-020
- **Description**: Vitest + Testing Library + jsdom; npm test script.
- **Acceptance criteria**:
  - [ ] npm test runs and passes in frontend/

#### AV-117 - CI pipeline with tests and dependency scanning
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-019, AV-028
- **Description**: GitHub Actions: lint, backend tests against a postgres:10 service, frontend tests, npm audit, Dependabot, secret scanning, and a check that no native modules are installed.
- **Acceptance criteria**:
  - [ ] Pull requests run the pipeline and block on failure
  - [ ] Dependabot is enabled for both packages
  - [ ] A native-module check fails the build if node-gyp is used

#### AV-118 - Public landing, pricing and sign-up pages
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-022, AV-023
- **Description**: Public pages: product landing for PPL students, pricing (from AV-102), sign-up CTA (social buttons), and links to terms, privacy and cookie notice. SEO basics.
- **Acceptance criteria**:
  - [ ] Pages work without login and at all breakpoints
  - [ ] Pricing reflects the plan matrix
  - [ ] Legal links are present in the footer

#### AV-119 - Admin area shell
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-024, AV-112
- **Description**: Role-gated /admin layout with navigation for content, question bank, users and subscriptions.
- **Acceptance criteria**:
  - [ ] Students cannot reach /admin routes (client and server enforced)
  - [ ] Admin navigation lists all admin sections

#### AV-162 - Legal pages and consent versioning
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-105, AV-014
- **Description**: Publish the Terms, Privacy and cookie notice pages from versioned documents. legal_acceptance stores user, document, version and time. Cookie notice for strictly necessary cookies only (no tracking unless decided).
- **Acceptance criteria**:
  - [ ] A version bump forces re-acceptance on next login
  - [ ] Pages are reachable without login

#### AV-176 - Consent records
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-162
- **Description**: Store explicit consent per purpose (terms/privacy acceptance, optional marketing email, optional analytics cookies if any) with version and timestamp, and allow withdrawal from account settings.
- **Acceptance criteria**:
  - [ ] Optional consents default to off and can be withdrawn
  - [ ] Every change is stored with version and time

#### AV-088 - Legal disclaimer and terms acceptance
- **Category**: DEVELOPMENT
- **Estimate**: 2 h
- **Depends on**: AV-024, AV-162
- **Description**: Aviation disclaimer text (es/en/pt) shown on calculators, the planner, exams and exports. The current Terms and Privacy versions must be accepted on first login and again after each version change (legal_acceptance).
- **Acceptance criteria**:
  - [ ] The user must accept the current terms version before using the app
  - [ ] Accepting a new version is recorded with a timestamp
  - [ ] The disclaimer appears on every PDF export

#### AV-029 - Walking-skeleton deployment to cPanel
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-001, AV-024, AV-013
- **Description**: Deploy the backend through Setup Node.js App (Passenger) with env vars, trust proxy enabled and HTTPS enforced. Run migrations against the hosted PostgreSQL 10.23, serve the Vite build and sign in with Google on the real domain. This de-risks hosting early.
- **Acceptance criteria**:
  - [ ] The production URL serves the login page over HTTPS with HSTS
  - [ ] Google sign-in works on the production domain
  - [ ] schema_migrations on the host lists all applied migrations
  - [ ] Deployment steps are written in docs/DEPLOYMENT.md

---

### Phase 3: Free Public Tools Hub (Acquisition Channel) and First Production Release

**Goal**: Ship the no-login, SEO-indexable free tools (flight calculator, unit converter, METAR/TAF decoder, airspeed calculator) to production before the paid area. They are the site's traffic hook, with soft subscription CTAs.

**Phase estimate**: 57 h (57 h development, 0 h administrative)

| ID | Title | Category | Est. (h) | Depends on |
|----|-------|----------|---------:|------------|
| AV-182 | Public free-tools hub shell | DEVELOPMENT | 5 | AV-021, AV-022, AV-023, AV-118 |
| AV-030 | Port unit converter as a free public tool (prototype: conversion.html) | DEVELOPMENT | 6 | AV-025, AV-028 |
| AV-031 | Port flight calculator as a free public tool (prototype: flightcal.html + script.js) | DEVELOPMENT | 10 | AV-025, AV-028 |
| AV-180 | Airspeed calculation library (IAS -> CAS -> EAS -> TAS -> GS) | DEVELOPMENT | 6 | AV-028 |
| AV-181 | Airspeed calculator UI (free public tool) | DEVELOPMENT | 5 | AV-180, AV-182 |
| AV-032 | Public weather proxy with caching and per-IP rate limiting | DEVELOPMENT | 6 | AV-010, AV-004, AV-113 |
| AV-033 | METAR/TAF decoder as a free public tool (port and improve js/weather-decoder.js + js/weather-api.js) | DEVELOPMENT | 8 | AV-032, AV-182 |
| AV-183 | SEO: prerendering, meta/OG tags and sitemap for public pages | DEVELOPMENT | 8 | AV-182, AV-030, AV-031, AV-181, AV-033 |
| AV-185 | Ship free tools to production (before the paid area) | DEVELOPMENT | 3 | AV-183, AV-029, AV-003 |

#### AV-182 - Public free-tools hub shell
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-021, AV-022, AV-023, AV-118
- **Description**: No-login public area /tools with a hub page and one route per tool (flight calculator, unit converter, METAR/TAF, airspeed). Mobile-first, fast (code-split per tool), shareable URLs that encode inputs in query params, and a soft, non-blocking subscription CTA on every tool.
- **Acceptance criteria**:
  - [ ] Opening a shared URL restores the exact inputs and result
  - [ ] Each tool page shows a soft CTA linking to pricing, without blocking use
  - [ ] Tool pages load without any authenticated API call

#### AV-030 - Port unit converter as a free public tool (prototype: conversion.html)
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-025, AV-028
- **Description**: Move the conversion factors into a pure JS units library with tests, and build a modern, fast, mobile-first React converter (no login). Existing categories: distance, speed, weight, volume, temperature, pressure, time. Add the roadmap units missing from the prototype (ft/s, sm, nm, USG/Qt/lQt, bar, angles deg/rad, decimal<->clock time).
- **Acceptance criteria**:
  - [ ] Every prototype conversion gives the same result in the new UI
  - [ ] Unit tests cover each category including temperature offsets
  - [ ] Roadmap unit list is fully covered

#### AV-031 - Port flight calculator as a free public tool (prototype: flightcal.html + script.js)
- **Category**: DEVELOPMENT
- **Estimate**: 10 h
- **Depends on**: AV-025, AV-028
- **Description**: Extract the takeoff distance, rate of climb, landing distance, climb, TAS/GS and level-flight calculations into pure functions with tests. Build a modern, fast, mobile-first React UI (no login) with Chart.js charts. Document the source of the embedded performance tables (C172-type POH).
- **Acceptance criteria**:
  - [ ] Results match the prototype for at least 10 reference inputs
  - [ ] Interpolation edge cases (outside table range) show a clear warning
  - [ ] Charts render in light and dark themes
  - [ ] Legal disclaimer is visible on the page

#### AV-180 - Airspeed calculation library (IAS -> CAS -> EAS -> TAS -> GS)
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-028
- **Description**: Pure JS ISA-based functions: pressure altitude from elevation and QNH, density altitude from OAT; IAS->CAS via a user-entered or per-aircraft calibration/position-error table; CAS->EAS with the compressibility correction; EAS->TAS via the density ratio; TAS->GS using the head/tailwind component from wind direction and speed versus course. Formulas and sources documented.
- **Acceptance criteria**:
  - [ ] Results match published reference examples (FAA/ICAO ISA tables, E6B) within rounding for 15 cases
  - [ ] Compressibility correction is negligible at low speeds and correct at higher CAS/altitudes (tests)
  - [ ] Invalid inputs (e.g. OAT below absolute zero) are rejected with messages

#### AV-181 - Airspeed calculator UI (free public tool)
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-180, AV-182
- **Description**: Mobile-first form with a step-by-step result chain (IAS, CAS, EAS, TAS, GS, plus pressure and density altitude), unit switching, and an explanation of each step.
- **Acceptance criteria**:
  - [ ] Every intermediate value is shown with units
  - [ ] Results update instantly as inputs change
  - [ ] Works without login and at 375px width

#### AV-032 - Public weather proxy with caching and per-IP rate limiting
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-010, AV-004, AV-113
- **Description**: Public (no login) GET /api/v1/weather/metar/:icao, /taf/:icao, /station/:icao and /metar/:icao/history. They proxy the weather API with the key kept server-side (the leaked key in js/config.js is revoked in AV-003), validate ICAO codes, use an in-memory TTL cache and a per-IP rate limit, and include abuse protection.
- **Acceptance criteria**:
  - [ ] The browser never receives the weather API key
  - [ ] Invalid ICAO codes return 400
  - [ ] Repeated requests within the TTL are served from cache
  - [ ] Exceeding the per-IP limit returns 429
  - [ ] Upstream failure returns 502 with a friendly message

#### AV-033 - METAR/TAF decoder as a free public tool (port and improve js/weather-decoder.js + js/weather-api.js)
- **Category**: DEVELOPMENT
- **Estimate**: 8 h
- **Depends on**: AV-032, AV-182
- **Description**: Port and improve the existing decodeMetar (js/weather-decoder.js) and the fetch logic fetchMetar, fetchMetarHistory and analyzeMetarTrends (js/weather-api.js) instead of rewriting from zero. Move the decoding into a tested pure module with a TAF decoder. Add ICAO search with suggestions, a plain-language decoded view, flight category (VFR/MVFR/IFR/LIFR), trends chart, and recent/favourite stations in localStorage (synced per user when logged in).
- **Acceptance criteria**:
  - [ ] Decoded output is at least as complete as the prototype for a sample corpus of METAR/TAF strings (tests)
  - [ ] Works without login and at 375px width
  - [ ] Flight category colour is displayed
  - [ ] All weather requests go through the backend proxy

#### AV-183 - SEO: prerendering, meta/OG tags and sitemap for public pages
- **Category**: DEVELOPMENT
- **Estimate**: 8 h
- **Depends on**: AV-182, AV-030, AV-031, AV-181, AV-033
- **Description**: Build-time static generation of the public routes (landing, pricing, tools hub, each tool) with a pure-JS approach (react-dom/server renderToString or a Vite SSG plugin; no headless browser), then hydrate on the client. Per-page title, description, canonical, Open Graph/Twitter tags, JSON-LD (WebApplication), sitemap.xml and robots.txt (private areas disallowed).
- **Acceptance criteria**:
  - [ ] View-source of each public tool page contains its full content and meta tags
  - [ ] sitemap.xml lists all public pages; robots.txt blocks /app and /admin
  - [ ] Lighthouse mobile scores are SEO >= 95 and Performance >= 90 on the tool pages

#### AV-185 - Ship free tools to production (before the paid area)
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-183, AV-029, AV-003
- **Description**: Release the public tools hub to production. Add 301 redirects from legacy URLs (flightcal.html, conversion.html, meteorologia.html, navegacion.html) to the new tool routes to keep existing traffic and rankings. Submit the sitemap to Google Search Console.
- **Acceptance criteria**:
  - [ ] Legacy URLs return 301 to the matching new route
  - [ ] Search Console accepts the sitemap
  - [ ] The paid area stays behind login/entitlements (or hidden) while unfinished

---

### Phase 4: Billing and Subscriptions

**Goal**: Hosted checkout, webhooks with idempotency, entitlements and subscription UI. Card data never touches our servers (PCI SAQ-A).

**Phase estimate**: 35 h (35 h development, 0 h administrative)

| ID | Title | Category | Est. (h) | Depends on |
|----|-------|----------|---------:|------------|
| AV-120 | Billing schema migration | DEVELOPMENT | 3 | AV-014 |
| AV-121 | Provider-agnostic billing module + Mercado Pago adapter | DEVELOPMENT | 6 | AV-120, AV-103 |
| AV-122 | Mercado Pago webhook endpoint with signature check and idempotency | DEVELOPMENT | 6 | AV-121, AV-114 |
| AV-123 | Entitlement middleware and feature gating | DEVELOPMENT | 4 | AV-120, AV-112, AV-102 |
| AV-124 | Subscription UI | DEVELOPMENT | 6 | AV-121, AV-123, AV-118 |
| AV-125 | Trial, grace period and cancellation rules | DEVELOPMENT | 4 | AV-122, AV-123 |
| AV-126 | Admin subscriptions view and reconciliation | DEVELOPMENT | 3 | AV-122, AV-119 |
| AV-127 | Billing end-to-end test plan (test mode) | DEVELOPMENT | 3 | AV-122, AV-124 |

#### AV-120 - Billing schema migration
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-014
- **Description**: Migration for billing_plan (amount as an integer in minor units + currency; CLP has zero decimals; seed one plan: 5000 CLP/month; trial_days nullable for an optional trial), billing_customer, subscription (provider, provider_subscription_id, status) and billing_event (provider + provider_event_id UNIQUE for idempotency). Statuses are trialing, active, past_due, canceled and incomplete. No card data columns.
- **Acceptance criteria**:
  - [ ] Migration runs on postgres:10 and is idempotent
  - [ ] billing_event.provider_event_id is unique
  - [ ] The schema has no column that could hold PAN/CVV

#### AV-121 - Provider-agnostic billing module + Mercado Pago adapter
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-120, AV-103
- **Description**: BillingProvider interface (createCheckout, cancel/manage, verifyNotification, fetchSubscription, mapStatus) with a Mercado Pago adapter: create a preapproval and redirect to its hosted init_point. Card data stays at Mercado Pago (PCI SAQ-A). Map preapproval statuses (pending, authorized, paused, cancelled) and authorized payment results to trialing/active/past_due/canceled/incomplete. Use the official `mercadopago` SDK only if it is pure JS, else plain HTTPS. Stripe and Flow.cl remain possible future adapters.
- **Acceptance criteria**:
  - [ ] Subscription checkout happens on the Mercado Pago hosted page; no card form is served by our domain
  - [ ] A future adapter would need no change outside the billing module
  - [ ] Unit tests cover the preapproval status mapping
  - [ ] CLP amounts are handled as integers

#### AV-122 - Mercado Pago webhook endpoint with signature check and idempotency
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-121, AV-114
- **Description**: POST /api/v1/billing/webhook: validate the x-signature header (HMAC with the webhook secret over the documented manifest: data.id, x-request-id, ts) and reject stale timestamps. Re-fetch the preapproval or payment from the Mercado Pago API before trusting it. Insert into billing_event with ON CONFLICT DO NOTHING, then update the subscription status in a transaction. Handle out-of-order events; audit every status change.
- **Acceptance criteria**:
  - [ ] Invalid or missing signature returns 400/401 and changes nothing
  - [ ] Replaying the same notification twice changes state only once (test)
  - [ ] Preapproval authorized/paused/cancelled and failed recurring payments update the status correctly

#### AV-123 - Entitlement middleware and feature gating
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-120, AV-112, AV-102
- **Description**: requireEntitlement(feature) middleware and a /api/v1/me/entitlements endpoint built from plan + subscription status (active/trialing = paid; past_due = grace period; canceled = free after period end). Matrix: the free public tools (flight calculator, unit converter, METAR/TAF decoder, airspeed calculator) need no login; everything else (education, exams, logbook, flights, aircraft, charts/weather map, planning/estimates, checklists, reports) requires an active subscription. Frontend hook useEntitlement hides or locks paid UI.
- **Acceptance criteria**:
  - [ ] Paid endpoints return 402/403 with an upgrade hint for non-subscribers
  - [ ] Public tool endpoints work without login
  - [ ] Admins bypass gating
  - [ ] Gating rules come from one config that matches the locked matrix

#### AV-124 - Subscription UI
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-121, AV-123, AV-118
- **Description**: Upgrade flow to the Mercado Pago hosted checkout, return pages, and an account billing page with plan, status, next charge date and a cancel action (API cancel of the preapproval). Banners for trial end and past_due. Prices are shown in CLP.
- **Acceptance criteria**:
  - [ ] A test-mode card completes checkout and unlocks paid features after the webhook
  - [ ] Canceling in the portal shows 'ends on <date>'
  - [ ] past_due shows a payment-update banner

#### AV-125 - Trial, grace period and cancellation rules
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-122, AV-123
- **Description**: Optional trial driven by billing_plan.trial_days (null = no trial) mapped to the preapproval free_trial setting, first subscription only (one per user). Past_due grace days after failed recurring payments, access until the end of the paid period after cancel, and reactivation through a new preapproval.
- **Acceptance criteria**:
  - [ ] A user cannot start a second trial
  - [ ] Access ends exactly at period end after cancellation (test with clock)

#### AV-126 - Admin subscriptions view and reconciliation
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-122, AV-119
- **Description**: Admin list of subscriptions and statuses plus a reconciliation command that compares local subscriptions with Mercado Pago preapprovals and reports mismatches.
- **Acceptance criteria**:
  - [ ] Reconciliation reports drift without changing data unless run with --fix
  - [ ] The admin view shows no payment-method details

#### AV-127 - Billing end-to-end test plan (test mode)
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-122, AV-124
- **Description**: Scripted scenarios with Mercado Pago sandbox test users and test cards: new subscription, failed recurring payment, recovery, cancel. Webhooks are delivered to a tunnel or staging URL. Includes a PCI SAQ-A self-check (no card data reaches our servers).
- **Acceptance criteria**:
  - [ ] All scenarios pass in test mode
  - [ ] The SAQ-A checklist is completed and stored

---

### Phase 5: Education Space

**Goal**: Subjects -> modules -> lessons with an admin CMS, sanitised rich content, assets, gating and progress tracking.

**Phase estimate**: 60 h (60 h development, 0 h administrative)

| ID | Title | Category | Est. (h) | Depends on |
|----|-------|----------|---------:|------------|
| AV-130 | Education schema migration | DEVELOPMENT | 4 | AV-014, AV-043 |
| AV-170 | Authority and regulation reference model | DEVELOPMENT | 6 | AV-130 |
| AV-131 | Content admin API | DEVELOPMENT | 6 | AV-130, AV-112, AV-114 |
| AV-172 | Content versioning for lessons and questions | DEVELOPMENT | 6 | AV-131 |
| AV-132 | Rich text sanitisation | DEVELOPMENT | 3 | AV-131 |
| AV-133 | Lesson assets (images, PDFs, video links) | DEVELOPMENT | 4 | AV-131, AV-043 |
| AV-134 | Admin content editor UI | DEVELOPMENT | 10 | AV-119, AV-131, AV-132, AV-133 |
| AV-135 | Student course catalogue and lesson viewer | DEVELOPMENT | 8 | AV-131, AV-123, AV-025 |
| AV-136 | Progress tracking | DEVELOPMENT | 5 | AV-135 |
| AV-137 | Seed DGAC Chile PPL subjects | DEVELOPMENT | 2 | AV-130, AV-100, AV-170 |
| AV-036 | Migrate prototype educational content into courses (prototypes: procedimientos.html, meteorologia.html, navegacion.html) | DEVELOPMENT | 6 | AV-134, AV-137 |
| AV-138 | Owner authoring: initial lessons (owner work, not dev-estimated) | ADMINISTRATIVE | 0 | AV-101, AV-134 |

#### AV-130 - Education schema migration
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-014, AV-043
- **Description**: Migration for subject, course_module, lesson, lesson_asset and lesson_progress, with ordering, draft/published status, an is_free flag for gating and per-user progress.
- **Acceptance criteria**:
  - [ ] Migration runs on postgres:10 and is idempotent
  - [ ] Progress is unique per (user, lesson)

#### AV-170 - Authority and regulation reference model
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-130
- **Description**: Tables authority (code e.g. DGAC-CL, country, name) and regulation_reference (authority, code e.g. 'DAN 61', section e.g. '61.105', version, effective_date, status current/superseded), plus link tables to subjects, lessons and questions. Admin API and UI to manage references and tag content. Prepared for future authorities (Ecuador RDAC, Bolivia RAB, Peru RAP).
- **Acceptance criteria**:
  - [ ] Subjects, lessons and questions can be tagged with one or more regulation references
  - [ ] Content can be filtered by authority and norm version
  - [ ] Adding a new authority needs only data, no code change

#### AV-131 - Content admin API
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-130, AV-112, AV-114
- **Description**: Admin CRUD for subjects, modules and lessons with ordering, draft/publish (publishing creates a version, see AV-172) and soft delete. Publishing is audited. The student read API returns the latest published version only, gated by entitlement except is_free items.
- **Acceptance criteria**:
  - [ ] Students never receive draft content
  - [ ] Paid lessons return 403 for free users; free lessons are open
  - [ ] Reordering persists

#### AV-172 - Content versioning for lessons and questions
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-131
- **Description**: Each publish of a lesson or question stores an immutable revision (author, timestamp, change note, regulation references). Students see the latest published revision; exam attempts keep the snapshot. Admins can compare and restore revisions.
- **Acceptance criteria**:
  - [ ] Publishing creates a new revision without altering earlier ones
  - [ ] Restore creates a new draft from an old revision
  - [ ] Exam history still shows the question text that was asked

#### AV-132 - Rich text sanitisation
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-131
- **Description**: Lesson body stored as HTML sanitised server-side with sanitize-html (pure JS) using a strict allowlist. Video embeds only from allowlisted hosts (YouTube/Vimeo) via iframe src validation.
- **Acceptance criteria**:
  - [ ] Script tags, event handlers and javascript: URLs are stripped (tests)
  - [ ] Non-allowlisted iframe hosts are removed

#### AV-133 - Lesson assets (images, PDFs, video links)
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-131, AV-043
- **Description**: Attach uploaded images/PDFs and external video links to lessons. Published lesson assets are readable by entitled users.
- **Acceptance criteria**:
  - [ ] An admin can attach and remove assets
  - [ ] A student without entitlement cannot download paid lesson PDFs

#### AV-134 - Admin content editor UI
- **Category**: DEVELOPMENT
- **Estimate**: 10 h
- **Depends on**: AV-119, AV-131, AV-132, AV-133
- **Description**: Solid authoring tool for the owner: WYSIWYG rich text editor (e.g. TipTap, pure JS) with headings, tables, images and callouts; drag-and-drop image/PDF upload; video link embed; regulation reference tagging; preview; draft/publish; version history with diff and restore; autosave and reordering.
- **Acceptance criteria**:
  - [ ] An admin can author and publish a full lesson with image, PDF and video
  - [ ] The preview matches the student view
  - [ ] Unsaved-changes warning on navigation

#### AV-135 - Student course catalogue and lesson viewer
- **Category**: DEVELOPMENT
- **Estimate**: 8 h
- **Depends on**: AV-131, AV-123, AV-025
- **Description**: Catalogue by subject -> modules -> lessons with lock icons for paid content. Lesson viewer with images, in-browser PDF viewing, video embed, previous/next navigation, and mobile friendly.
- **Acceptance criteria**:
  - [ ] Locked lessons show an upgrade prompt
  - [ ] The lesson viewer works at 375px width
  - [ ] PDFs open without a separate download

#### AV-136 - Progress tracking
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-135
- **Description**: Mark lessons complete (manual + on reaching the end), percentage per module and subject, and 'continue where you left off' on the dashboard.
- **Acceptance criteria**:
  - [ ] Progress percentages match completed lessons (test)
  - [ ] Resume opens the last viewed lesson

#### AV-137 - Seed DGAC Chile PPL subjects
- **Category**: DEVELOPMENT
- **Estimate**: 2 h
- **Depends on**: AV-130, AV-100, AV-170
- **Description**: Idempotent seed of the DGAC Chile authority, its DAN/DAR references (e.g. DAN 61) and the PPL ground-school subjects from AV-100, tagged with authority and regulation_reference.
- **Acceptance criteria**:
  - [ ] Subjects match the DGAC Chile syllabus recorded in AV-100
  - [ ] Each subject is linked to its regulation references
  - [ ] The seed is re-runnable without duplicates

#### AV-036 - Migrate prototype educational content into courses (prototypes: procedimientos.html, meteorologia.html, navegacion.html)
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-134, AV-137
- **Description**: Move the existing static content (emergency procedures, ATC phraseology, SOPs, meteorology, chart reading) into Education lessons under the right subjects, using the admin editor.
- **Acceptance criteria**:
  - [ ] All prototype content exists as published lessons under the correct subjects
  - [ ] Images are uploaded through the secure upload service
  - [ ] Legacy pages can be retired after this task

#### AV-138 - Owner authoring: initial lessons (owner work, not dev-estimated)
- **Category**: ADMINISTRATIVE
- **Estimate**: 0 h
- **Depends on**: AV-101, AV-134
- **Description**: The owner writes and publishes the first modules of each subject in the CMS, following DAN/DAR. This is owner work and is not counted in the development estimate.
- **Acceptance criteria**:
  - [ ] At least one published module per subject before launch
  - [ ] Content backlog tracked per subject

---

### Phase 6: Evaluation (Question Bank and Exams)

**Goal**: Question bank, quiz and mock-exam generation, timed attempts, weighted scoring, history and stats.

**Phase estimate**: 59 h (59 h development, 0 h administrative)

| ID | Title | Category | Est. (h) | Depends on |
|----|-------|----------|---------:|------------|
| AV-140 | Evaluation schema migration | DEVELOPMENT | 5 | AV-130 |
| AV-141 | Question bank admin API and CSV/JSON import | DEVELOPMENT | 6 | AV-140, AV-112 |
| AV-142 | Question bank admin UI | DEVELOPMENT | 8 | AV-141, AV-119 |
| AV-171 | Norm-change review workflow | DEVELOPMENT | 5 | AV-170, AV-172, AV-141 |
| AV-143 | Exam generation service | DEVELOPMENT | 6 | AV-141, AV-100 |
| AV-144 | Timed attempts with server-side enforcement | DEVELOPMENT | 6 | AV-143 |
| AV-145 | Scoring engine with weighting and pass threshold | DEVELOPMENT | 5 | AV-143 |
| AV-146 | Exam-taking UI | DEVELOPMENT | 10 | AV-144, AV-145, AV-025, AV-123 |
| AV-147 | Results, attempt history and performance stats | DEVELOPMENT | 8 | AV-145, AV-146 |
| AV-149 | Owner authoring: initial question bank (owner work, not dev-estimated) | ADMINISTRATIVE | 0 | AV-101, AV-142 |

#### AV-140 - Evaluation schema migration
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-130
- **Description**: Migration for question, question_option, exam_template, exam_template_subject (weights, question counts, per-subject pass rule), exam_attempt (deadline, score, passed) and exam_attempt_item (question snapshot, chosen option, correctness, weight).
- **Acceptance criteria**:
  - [ ] Migration runs on postgres:10 and is idempotent
  - [ ] Attempts keep a snapshot so later question edits do not change past results

#### AV-141 - Question bank admin API and CSV/JSON import
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-140, AV-112
- **Description**: Admin CRUD for questions (multiple choice with a single correct answer at minimum, explanation, image, difficulty, weight, subject/module and regulation_reference tags). CSV and JSON import with a dry-run validation report. Draft/publish/retire with versions (AV-172).
- **Acceptance criteria**:
  - [ ] Importing a CSV or JSON file with errors reports line-level issues and imports nothing
  - [ ] Dry-run mode shows what would be created or updated
  - [ ] Retired questions are excluded from new exams but kept for history

#### AV-142 - Question bank admin UI
- **Category**: DEVELOPMENT
- **Estimate**: 8 h
- **Depends on**: AV-141, AV-119
- **Description**: List, filter, edit and preview questions; CSV upload; per-subject counts.
- **Acceptance criteria**:
  - [ ] An admin can create, edit, retire and import questions
  - [ ] Filters by subject, status and difficulty work together

#### AV-171 - Norm-change review workflow
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-170, AV-172, AV-141
- **Description**: When a regulation_reference is superseded by a new version, every linked lesson and question is flagged review_required. The admin gets a review queue with links to the affected content and can confirm, edit or retire each item. Affected exam questions can be paused automatically.
- **Acceptance criteria**:
  - [ ] Superseding a reference flags all linked content (test)
  - [ ] The review queue lists flagged items with their norm and version
  - [ ] Clearing a flag is audited

#### AV-143 - Exam generation service
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-141, AV-100
- **Description**: Generate a subject quiz or a full mock exam from an exam_template: random questions per subject per weights and counts, no duplicates, option shuffling, and a snapshot stored in the attempt.
- **Acceptance criteria**:
  - [ ] Generated exams respect counts per subject (test)
  - [ ] The same question never appears twice in one attempt
  - [ ] Generation fails clearly if the bank has too few questions

#### AV-144 - Timed attempts with server-side enforcement
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-143
- **Description**: Start sets a server deadline. Answers autosave. Submit or automatic submit happens at expiry, and late answers are rejected. Correct answers are never sent to the client before submission. One active attempt per template per user.
- **Acceptance criteria**:
  - [ ] Answers sent after the deadline are rejected (test)
  - [ ] The API never exposes correct options before submit
  - [ ] Reloading the page resumes the attempt with remaining time

#### AV-145 - Scoring engine with weighting and pass threshold
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-143
- **Description**: Weighted score per question and per subject (ponderación), overall pass threshold plus optional per-subject minimums, as pure functions with unit tests.
- **Acceptance criteria**:
  - [ ] Scores match hand-calculated examples for 10 cases
  - [ ] Per-subject minimum failures mark the exam failed even when the overall score passes

#### AV-146 - Exam-taking UI
- **Category**: DEVELOPMENT
- **Estimate**: 10 h
- **Depends on**: AV-144, AV-145, AV-025, AV-123
- **Description**: Exam screen: countdown timer, question navigation, flag for review, autosave indicator, submit confirmation, time-up auto submit. Mobile friendly. Paid gating for mock exams.
- **Acceptance criteria**:
  - [ ] Works at 375px width
  - [ ] Timer survives reload
  - [ ] Accessible with the keyboard

#### AV-147 - Results, attempt history and performance stats
- **Category**: DEVELOPMENT
- **Estimate**: 8 h
- **Depends on**: AV-145, AV-146
- **Description**: Result page with score, pass/fail and review of answers with explanations (after submit). Attempt history and per-subject performance stats and trends (Chart.js).
- **Acceptance criteria**:
  - [ ] Stats per subject match the stored attempts (test)
  - [ ] History lists all attempts with date, score and duration

#### AV-149 - Owner authoring: initial question bank (owner work, not dev-estimated)
- **Category**: ADMINISTRATIVE
- **Estimate**: 0 h
- **Depends on**: AV-101, AV-142
- **Description**: The owner writes and imports the initial question bank per subject (enough for the mock-exam template). This is owner work and is not counted in the development estimate.
- **Acceptance criteria**:
  - [ ] Question count per subject meets the template minimums before launch

---

### Phase 7: Aircraft Module

**Goal**: Manufacturers, models, user aircraft, maintenance logbook and documents.

**Phase estimate**: 31 h (31 h development, 0 h administrative)

| ID | Title | Category | Est. (h) | Depends on |
|----|-------|----------|---------:|------------|
| AV-040 | Catalog API: manufacturers and models | DEVELOPMENT | 5 | AV-015, AV-018 |
| AV-041 | Aircraft API (user-scoped) | DEVELOPMENT | 5 | AV-040 |
| AV-042 | Aircraft logbook API (maintenance entries) | DEVELOPMENT | 4 | AV-041 |
| AV-044 | Aircraft list, detail and form UI | DEVELOPMENT | 8 | AV-041, AV-025, AV-027 |
| AV-045 | Manufacturer and model forms UI | DEVELOPMENT | 4 | AV-040, AV-025 |
| AV-046 | Aircraft maintenance logbook UI | DEVELOPMENT | 5 | AV-042, AV-043, AV-044 |

#### AV-040 - Catalog API: manufacturers and models
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-015, AV-018
- **Description**: CRUD + search for aircraft_manufacturer and aircraft_model with soft delete and optimistic locking.
- **Acceptance criteria**:
  - [ ] List, create, update and soft-delete work via API tests
  - [ ] Duplicate manufacturer name returns 409

#### AV-041 - Aircraft API (user-scoped)
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-040
- **Description**: CRUD for aircraft scoped by user_id; registration unique per user; model parameter overrides; performance_params JSONB; hobbs/tach read-only via API (updated by flight log).
- **Acceptance criteria**:
  - [ ] A user cannot read or modify another user's aircraft (test)
  - [ ] Effective parameters fall back to the model when no override exists
  - [ ] Stale update returns 409

#### AV-042 - Aircraft logbook API (maintenance entries)
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-041
- **Description**: CRUD for aircraft_logbook entries with next_service_hours/date and cost.
- **Acceptance criteria**:
  - [ ] Entries are listed newest first with pagination
  - [ ] entry_type outside the allowed values returns 400

#### AV-044 - Aircraft list, detail and form UI
- **Category**: DEVELOPMENT
- **Estimate**: 8 h
- **Depends on**: AV-041, AV-025, AV-027
- **Description**: Aircraft list (cards), detail with parameters/documents/expiries, create/edit form with model selector and overrides, AircraftSelector component.
- **Acceptance criteria**:
  - [ ] User can create, edit and soft-delete an aircraft
  - [ ] Expiry dates show alert colours
  - [ ] Form validates required fields before submit

#### AV-045 - Manufacturer and model forms UI
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-040, AV-025
- **Description**: Screens to add/edit manufacturers and models (performance, fuel, weights).
- **Acceptance criteria**:
  - [ ] New model appears in the aircraft form selector immediately

#### AV-046 - Aircraft maintenance logbook UI
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-042, AV-043, AV-044
- **Description**: Maintenance history list, entry form with document upload and next service fields.
- **Acceptance criteria**:
  - [ ] User can add an inspection with a PDF attachment and download it later

---

### Phase 8: Personal Logbook Module

**Goal**: Pilot profile, licences, personal logbook with ICAO routes and Excel export.

**Phase estimate**: 36 h (36 h development, 0 h administrative)

| ID | Title | Category | Est. (h) | Depends on |
|----|-------|----------|---------:|------------|
| AV-050 | Pilot profile API | DEVELOPMENT | 3 | AV-018 |
| AV-051 | Pilot licences API | DEVELOPMENT | 3 | AV-050, AV-043 |
| AV-052 | Pilot logbook API with totals | DEVELOPMENT | 5 | AV-050, AV-041 |
| AV-053 | Pilot profile and licences UI | DEVELOPMENT | 6 | AV-050, AV-051, AV-025 |
| AV-054 | ICAO route parser/builder | DEVELOPMENT | 6 | AV-028 |
| AV-055 | Personal logbook UI | DEVELOPMENT | 8 | AV-052, AV-054 |
| AV-056 | Excel export of logbook with detailed routes | DEVELOPMENT | 5 | AV-052 |

#### AV-050 - Pilot profile API
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-018
- **Description**: GET/PUT /api/v1/pilot (one pilot per user), licence and medical data.
- **Acceptance criteria**:
  - [ ] Profile is created on first save and updated afterwards
  - [ ] total_hours is read-only through the API

#### AV-051 - Pilot licences API
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-050, AV-043
- **Description**: CRUD for pilot_licenses including scanned document upload.
- **Acceptance criteria**:
  - [ ] Licences are scoped to the user's pilot
  - [ ] Expiry date is optional and validated as a date

#### AV-052 - Pilot logbook API with totals
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-050, AV-041
- **Description**: CRUD for pilot_logbook with filters (date range, aircraft, airport) and totals per category (PIC, SIC, dual, night, IFR, XC, landings, approaches).
- **Acceptance criteria**:
  - [ ] Totals endpoint matches the sum of entries (test)
  - [ ] Filters combine correctly

#### AV-053 - Pilot profile and licences UI
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-050, AV-051, AV-025
- **Description**: Profile page with photo, licence/medical data and licence cards with expiry status.
- **Acceptance criteria**:
  - [ ] User can maintain profile and licences end to end
  - [ ] Expiring items show the alert colour scale

#### AV-054 - ICAO route parser/builder
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-028
- **Description**: Shared pure JS utility that parses and builds ICAO route strings (e.g. 'SVMI/10L N0176F230 OSMAR2 OSMAR W20 CBC G443 PARDU SVMT/D299J.D06 SVMG') into departure/runway, speed/level, SID, waypoints, airways, STAR, approach, arrival.
- **Acceptance criteria**:
  - [ ] The documented example parses into the fields listed in DATABASE_SCHEMA.md
  - [ ] Builder(parse(x)) returns x for the test corpus
  - [ ] Malformed strings return descriptive errors instead of throwing

#### AV-055 - Personal logbook UI
- **Category**: DEVELOPMENT
- **Estimate**: 8 h
- **Depends on**: AV-052, AV-054
- **Description**: Logbook table with filters and totals summary, entry form with time categories and ICAO route fields (parsed from a route string or entered separately).
- **Acceptance criteria**:
  - [ ] User can add, edit and soft-delete entries
  - [ ] Totals summary updates after changes
  - [ ] Route string auto-fills SID/STAR/waypoints/airways fields

#### AV-056 - Excel export of logbook with detailed routes
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-052
- **Description**: Export filtered logbook to .xlsx (pure-JS library, e.g. exceljs or SheetJS) including route breakdown columns and totals row.
- **Acceptance criteria**:
  - [ ] Exported file opens in Excel and LibreOffice
  - [ ] Rows and totals match the on-screen filter

---

### Phase 9: Flight Records, Alerts and Maintenance

**Goal**: Flight log with automatic side effects, expiry/maintenance alerts and the dashboard.

**Phase estimate**: 33 h (33 h development, 0 h administrative)

| ID | Title | Category | Est. (h) | Depends on |
|----|-------|----------|---------:|------------|
| AV-060 | Flight log API with transactional side effects | DEVELOPMENT | 8 | AV-052, AV-042 |
| AV-061 | Flight record UI | DEVELOPMENT | 8 | AV-060, AV-055, AV-044 |
| AV-062 | Alerts service and endpoint | DEVELOPMENT | 5 | AV-060 |
| AV-063 | Operations dashboard | DEVELOPMENT | 6 | AV-062, AV-026, AV-136, AV-147 |
| AV-064 | Maintenance module UI | DEVELOPMENT | 6 | AV-062, AV-046 |

#### AV-060 - Flight log API with transactional side effects
- **Category**: DEVELOPMENT
- **Estimate**: 8 h
- **Depends on**: AV-052, AV-042
- **Description**: CRUD for flight_log; in one transaction: recompute pilot.total_hours, update aircraft hobbs/tach (GREATEST), create/update the linked pilot_logbook entry; soft delete reverses totals.
- **Acceptance criteria**:
  - [ ] Creating a flight updates pilot total hours, aircraft hobbs/tach and creates one logbook entry atomically
  - [ ] A failure in any step rolls back everything (test)
  - [ ] Soft-deleting a flight recalculates total hours

#### AV-061 - Flight record UI
- **Category**: DEVELOPMENT
- **Estimate**: 8 h
- **Depends on**: AV-060, AV-055, AV-044
- **Description**: Flight list and form: aircraft selector (last used first), times, hobbs/tach start/end, fuel start/added/end/used, route, conditions, passengers, notes/issues.
- **Acceptance criteria**:
  - [ ] Fuel used and flight time are pre-computed from inputs and editable
  - [ ] hobbs_end lower than hobbs_start is rejected

#### AV-062 - Alerts service and endpoint
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-060
- **Description**: GET /api/v1/alerts computing licence, medical, ratings, insurance, registration, airworthiness and maintenance-hours alerts using user_preferences thresholds and the green/yellow/orange/red scale.
- **Acceptance criteria**:
  - [ ] Each alert type is covered by a test with boundary days (30/15/7/0)
  - [ ] Maintenance alert triggers when hobbs is within maintenance_alert_hours of next_service_hours

#### AV-063 - Operations dashboard
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-062, AV-026, AV-136, AV-147
- **Description**: Home page: logo header, UtcClock, study progress and recent exam scores, priority alerts (modal after login when any is yellow or worse), flight stats, and quick-access tiles filtered by subscription entitlements.
- **Acceptance criteria**:
  - [ ] Alert modal appears once per session when alerts exist
  - [ ] Stats match API data
  - [ ] Layout works at all three breakpoints

#### AV-064 - Maintenance module UI
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-062, AV-046
- **Description**: Upcoming services by hours/date across the fleet, overdue highlighting, maintenance cost tracking per aircraft.
- **Acceptance criteria**:
  - [ ] Overdue items are listed first and highlighted red
  - [ ] Cost totals per aircraft match the logbook entries

---

### Phase 10: Charts, Flight Planning and Estimates

**Goal**: Paid tools: weather map/charts, E6B navigation, and the pre-flight planner with navigation, fuel, weight and balance, performance and cost estimates, NavLog and plan vs actual.

**Phase estimate**: 69 h (69 h development, 0 h administrative)

| ID | Title | Category | Est. (h) | Depends on |
|----|-------|----------|---------:|------------|
| AV-034 | Weather map / charts (paid; prototype: navegacion.html Leaflet + OpenWeatherMap layers) | DEVELOPMENT | 5 | AV-032, AV-123 |
| AV-035 | E6B / quick navigation calculator (paid; prototype: navegacion.html route calculator) | DEVELOPMENT | 6 | AV-030, AV-123 |
| AV-070 | Airport/waypoint reference data | DEVELOPMENT | 6 | AV-002, AV-014 |
| AV-071 | Navigation calculation library | DEVELOPMENT | 8 | AV-035, AV-070 |
| AV-072 | Fuel planning calculations | DEVELOPMENT | 4 | AV-071 |
| AV-073 | Weight and balance calculations | DEVELOPMENT | 6 | AV-041 |
| AV-074 | Generalised performance calculations | DEVELOPMENT | 5 | AV-031, AV-041 |
| AV-075 | Cost calculations | DEVELOPMENT | 2 | AV-072 |
| AV-076 | Flight plan persistence | DEVELOPMENT | 4 | AV-060 |
| AV-077 | Flight planner UI | DEVELOPMENT | 12 | AV-071, AV-072, AV-073, AV-074, AV-075, AV-076, AV-054 |
| AV-078 | NavLog and printable/PDF export | DEVELOPMENT | 6 | AV-077 |
| AV-079 | Plan vs actual and post-flight conversion | DEVELOPMENT | 5 | AV-077, AV-061 |

#### AV-034 - Weather map / charts (paid; prototype: navegacion.html Leaflet + OpenWeatherMap layers)
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-032, AV-123
- **Description**: A paid feature. Leaflet map with toggleable weather layers and a legend. Tiles are requested through a backend proxy so the OpenWeatherMap key is not exposed. Gated by entitlement.
- **Acceptance criteria**:
  - [ ] Layers toggle on/off with legend updates
  - [ ] OpenWeatherMap key does not appear in browser network requests

#### AV-035 - E6B / quick navigation calculator (paid; prototype: navegacion.html route calculator)
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-030, AV-123
- **Description**: Wind triangle (WCA, heading, GS), time/speed/distance, fuel burn, TAS from CAS/altitude/temperature; reuse the prototype route calculation logic.
- **Acceptance criteria**:
  - [ ] Results agree with a physical/electronic E6B within rounding for 10 reference cases
  - [ ] Inputs accept the user's preferred units

#### AV-070 - Airport/waypoint reference data
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-002, AV-014
- **Description**: Schema gap: the 10-table design has no airport/waypoint coordinates. Add migration for an airport table (ICAO, name, lat/lon, elevation, runways JSONB) and an import script from OurAirports CSV, or implement manual coordinates per waypoint, per AV-002.
- **Acceptance criteria**:
  - [ ] Distance between two ICAO airports can be computed from stored coordinates
  - [ ] Import is idempotent and re-runnable
  - [ ] Schema change is documented in DATABASE_SCHEMA.md

#### AV-071 - Navigation calculation library
- **Category**: DEVELOPMENT
- **Estimate**: 8 h
- **Depends on**: AV-035, AV-070
- **Description**: Great-circle distance per leg and total, true and magnetic course (manual variation input), wind correction angle, heading, GS, ETE, cruise TAS/IAS; tests against E6B reference cases.
- **Acceptance criteria**:
  - [ ] Distances within 0.5% of reference values
  - [ ] Course/heading within 1 degree of E6B results for the test set

#### AV-072 - Fuel planning calculations
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-071
- **Description**: Fuel per leg, reserve (45 min VFR / IFR rule configurable), alternate fuel, total required, validation against usable capacity.
- **Acceptance criteria**:
  - [ ] Plan exceeding usable fuel shows a blocking warning
  - [ ] Reserve rule is configurable and covered by tests

#### AV-073 - Weight and balance calculations
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-041
- **Description**: Station arms and CG envelope stored in aircraft.performance_params JSONB; compute total weight, CG and check MTOW/envelope limits.
- **Acceptance criteria**:
  - [ ] Out-of-envelope or over-MTOW results are highlighted red
  - [ ] Tests reproduce a POH sample loading problem

#### AV-074 - Generalised performance calculations
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-031, AV-041
- **Description**: Reuse the ported performance functions with per-aircraft tables (takeoff/landing distance, climb rate, time/distance to cruise).
- **Acceptance criteria**:
  - [ ] Calculations use the selected aircraft's tables when present and warn when falling back to defaults

#### AV-075 - Cost calculations
- **Category**: DEVELOPMENT
- **Estimate**: 2 h
- **Depends on**: AV-072
- **Description**: Fuel cost, hourly operating cost, total flight cost, cost per passenger/mile.
- **Acceptance criteria**:
  - [ ] Costs recalculate when fuel price or hourly rate changes

#### AV-076 - Flight plan persistence
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-060
- **Description**: Schema gap: flight_log stores performed flights only. Add a status column ('planned'/'completed') via migration (or a separate plan store per AV-002) and save flight_plan/calculations JSONB.
- **Acceptance criteria**:
  - [ ] A plan can be saved, reopened and edited before the flight
  - [ ] Planned flights do not affect totals, hobbs or logbook

#### AV-077 - Flight planner UI
- **Category**: DEVELOPMENT
- **Estimate**: 12 h
- **Depends on**: AV-071, AV-072, AV-073, AV-074, AV-075, AV-076, AV-054
- **Description**: Planner: aircraft selection with automatic parameter load, route editor (ICAO string or step by step: airports, runways, SID, waypoints, airways, STAR, approach, alternates), legs table and calculation panels.
- **Acceptance criteria**:
  - [ ] A full IFR example route can be planned end to end
  - [ ] Changing aircraft recalculates all panels
  - [ ] Saved plan stores the ICAO route string

#### AV-078 - NavLog and printable/PDF export
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-077
- **Description**: NavLog table per leg (course, heading, distance, GS, ETE, fuel) with print stylesheet and PDF export (pure-JS library or browser print).
- **Acceptance criteria**:
  - [ ] NavLog prints on one A4/Letter page for a 6-leg route
  - [ ] PDF includes logo header and disclaimer

#### AV-079 - Plan vs actual and post-flight conversion
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-077, AV-061
- **Description**: Convert a planned flight into a completed flight record (prefilled), show plan vs actual fuel/time/distance/route.
- **Acceptance criteria**:
  - [ ] Completing a plan triggers the same side effects as AV-060
  - [ ] Deviation values are shown for fuel and time

---

### Phase 11: Checklists, Settings and Reports

**Goal**: User-uploaded and interactive checklists with a step-through mode, preferences, module manager and reports.

**Phase estimate**: 48 h (48 h development, 0 h administrative)

| ID | Title | Category | Est. (h) | Depends on |
|----|-------|----------|---------:|------------|
| AV-080 | User preferences API | DEVELOPMENT | 3 | AV-014, AV-018 |
| AV-081 | Settings UI and module manager | DEVELOPMENT | 8 | AV-080, AV-027, AV-022, AV-023 |
| AV-082 | Apply unit preferences across the UI | DEVELOPMENT | 4 | AV-081, AV-030 |
| AV-083 | Checklists API (interactive and document) | DEVELOPMENT | 4 | AV-015, AV-018, AV-043, AV-041 |
| AV-084 | Interactive checklist builder UI | DEVELOPMENT | 6 | AV-083, AV-025 |
| AV-150 | Checklist document upload and viewer | DEVELOPMENT | 5 | AV-083, AV-043 |
| AV-151 | Step-through checklist mode | DEVELOPMENT | 4 | AV-084, AV-150 |
| AV-085 | Reports and statistics API | DEVELOPMENT | 5 | AV-060 |
| AV-086 | Reports UI and exports | DEVELOPMENT | 6 | AV-085, AV-056 |
| AV-087 | Flight mode and accessibility preferences | DEVELOPMENT | 3 | AV-081 |

#### AV-080 - User preferences API
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-014, AV-018
- **Description**: GET/PUT /api/v1/preferences with validation of units, language, theme, density, accessibility, alert thresholds and enabled_modules.
- **Acceptance criteria**:
  - [ ] Invalid values return 400
  - [ ] Defaults exist for every new user

#### AV-081 - Settings UI and module manager
- **Category**: DEVELOPMENT
- **Estimate**: 8 h
- **Depends on**: AV-080, AV-027, AV-022, AV-023
- **Description**: Settings pages: units, language, theme, font scale, density, accessibility, flight mode, alert days, module manager with dependency validation; About page.
- **Acceptance criteria**:
  - [ ] Every preference persists and is applied after reload
  - [ ] Module toggles respect dependencies

#### AV-082 - Apply unit preferences across the UI
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-081, AV-030
- **Description**: Formatting helpers that display values in preferred units with optional dual units ('150 kts / 278 km/h') and always-visible unit labels.
- **Acceptance criteria**:
  - [ ] Changing speed unit updates aircraft, planner and logbook views
  - [ ] Dual-unit option works for all unit types

#### AV-083 - Checklists API (interactive and document)
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-015, AV-018, AV-043, AV-041
- **Description**: CRUD for user checklists, linked optionally to one of the user's aircraft or to a model. Two types: interactive (JSONB items) and document (uploaded PDF/image via stored_file). System templates are read-only and can be copied.
- **Acceptance criteria**:
  - [ ] Users only see their own checklists plus system templates
  - [ ] A document checklist needs a valid uploaded file of an allowed type
  - [ ] Users can copy a system template and edit the copy

#### AV-084 - Interactive checklist builder UI
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-083, AV-025
- **Description**: Builder for itemised checklists: phases, items, action text, critical flag, drag-to-reorder, duplicate from template.
- **Acceptance criteria**:
  - [ ] Critical items are visually distinct
  - [ ] Editor supports reordering and saves version-safe (409 on conflict)

#### AV-150 - Checklist document upload and viewer
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-083, AV-043
- **Description**: Upload an aircraft checklist as PDF or image, link it to an aircraft, and view it in-app with zoom and page navigation, mobile friendly.
- **Acceptance criteria**:
  - [ ] Upload of an allowed PDF/image succeeds and disallowed types are rejected
  - [ ] The viewer works at 375px with pinch-zoom

#### AV-151 - Step-through checklist mode
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-084, AV-150
- **Description**: Cockpit run mode: one item at a time with large touch targets, check/skip, critical-item confirmation, progress per phase, screen wake lock where supported, and flight-mode styling. Document checklists run page by page.
- **Acceptance criteria**:
  - [ ] The whole checklist can be completed with one hand on a phone
  - [ ] Critical items require an explicit confirmation
  - [ ] The screen stays awake during a run where the Wake Lock API exists

#### AV-085 - Reports and statistics API
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-060
- **Description**: Aggregates: hours per month/category, airports visited, most flown routes, fuel and cost trends, maintenance costs.
- **Acceptance criteria**:
  - [ ] Aggregates match raw data for a seeded dataset (test)
  - [ ] Queries run under 1 second with 2,000 flights

#### AV-086 - Reports UI and exports
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-085, AV-056
- **Description**: Charts (Chart.js) and tables with Excel/PDF export.
- **Acceptance criteria**:
  - [ ] Each chart has an accessible table alternative
  - [ ] Exports reflect active filters

#### AV-087 - Flight mode and accessibility preferences
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-081
- **Description**: Flight mode (dark, high contrast, larger text), prefers-reduced-motion and prefers-contrast support, information density spacing scale.
- **Acceptance criteria**:
  - [ ] Flight mode can be toggled in one tap from the app bar
  - [ ] Animations are disabled when reduced motion is preferred

---

### Phase 12: Privacy, QA, Hardening and Production Release

**Goal**: Account deletion and data export, calculation validation, security review, E2E tests, backups and go-live.

**Phase estimate**: 48 h (39 h development, 9 h administrative)

| ID | Title | Category | Est. (h) | Depends on |
|----|-------|----------|---------:|------------|
| AV-160 | Account deletion (self-service) | DEVELOPMENT | 6 | AV-122, AV-114, AV-043 |
| AV-161 | Personal data export | DEVELOPMENT | 5 | AV-160 |
| AV-174 | Data subject rights handling (Ley 19.628 / 21.719, confirm with legal counsel) | DEVELOPMENT | 4 | AV-160, AV-161 |
| AV-090 | Calculation reference test suite | DEVELOPMENT | 6 | AV-071, AV-072, AV-073, AV-074 |
| AV-091 | Aeronautical review with a certified pilot | ADMINISTRATIVE | 3 | AV-090, AV-077, AV-147 |
| AV-092 | Security hardening and review | DEVELOPMENT | 6 | AV-029, AV-111, AV-113 |
| AV-093 | End-to-end smoke tests | DEVELOPMENT | 6 | AV-079, AV-151, AV-146, AV-124 |
| AV-094 | Production build and Passenger configuration | DEVELOPMENT | 3 | AV-029, AV-092 |
| AV-095 | Production release and runbook | ADMINISTRATIVE | 3 | AV-094, AV-091 |
| AV-096 | Backup policy and restore drill | ADMINISTRATIVE | 2 | AV-095 |
| AV-097 | Retire legacy static pages | ADMINISTRATIVE | 1 | AV-095, AV-002, AV-036, AV-185 |
| AV-098 | Developer and API documentation | DEVELOPMENT | 3 | AV-094 |

#### AV-160 - Account deletion (self-service)
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-122, AV-114, AV-043
- **Description**: Delete-account flow: confirmation, cancel the active subscription at the provider, revoke sessions, delete or anonymise personal data and uploaded files, and keep only the billing records required by law (pseudonymised). Audited.
- **Acceptance criteria**:
  - [ ] After deletion the user cannot log in and personal data is gone (test)
  - [ ] Billing records kept are pseudonymised and documented
  - [ ] The active subscription is canceled at the provider

#### AV-161 - Personal data export
- **Category**: DEVELOPMENT
- **Estimate**: 5 h
- **Depends on**: AV-160
- **Description**: Self-service export of all user data (profile, logbook, flights, aircraft, checklists, progress, attempts) as JSON plus uploaded files in a ZIP (pure-JS zip library). Audited and rate limited.
- **Acceptance criteria**:
  - [ ] The export contains every table listed in the data inventory for the user
  - [ ] Another user's data never appears (test)

#### AV-174 - Data subject rights handling (Ley 19.628 / 21.719, confirm with legal counsel)
- **Category**: DEVELOPMENT
- **Estimate**: 4 h
- **Depends on**: AV-160, AV-161
- **Description**: Self-service access (view profile and data), rectification (edit profile), deletion (AV-160) and portability (AV-161), plus a request form and log for opposition/other requests with a response deadline tracker for the owner.
- **Acceptance criteria**:
  - [ ] Each right has a documented path (self-service or request)
  - [ ] Requests are logged with received and answered dates
  - [ ] Flow reviewed by legal counsel

#### AV-090 - Calculation reference test suite
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-071, AV-072, AV-073, AV-074
- **Description**: Consolidated test cases for navigation, fuel, W&B, performance and conversions with documented sources (FAA PHAK, POH, E6B).
- **Acceptance criteria**:
  - [ ] Each critical formula has at least 5 sourced reference cases
  - [ ] Sources are referenced in code comments

#### AV-091 - Aeronautical review with a certified pilot
- **Category**: ADMINISTRATIVE
- **Estimate**: 3 h
- **Depends on**: AV-090, AV-077, AV-147
- **Description**: Walk through calculators, planner and logbook with a certified pilot/instructor and record findings.
- **Acceptance criteria**:
  - [ ] Review notes recorded and findings turned into tasks or accepted risks

#### AV-092 - Security hardening and review
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-029, AV-111, AV-113
- **Description**: Production CSP via helmet (no inline scripts, Mercado Pago and OAuth origins allowlisted), HSTS, CORS allowlist, cookie flags, rate limits, upload checks, user-scoping review of every query, and an OWASP ASVS L1 checklist pass.
- **Acceptance criteria**:
  - [ ] npm audit shows no high/critical issues
  - [ ] Every repository query filters by user_id where applicable (review checklist signed off)
  - [ ] The CSP blocks inline scripts in production
  - [ ] The ASVS L1 checklist is completed with findings resolved or accepted

#### AV-093 - End-to-end smoke tests
- **Category**: DEVELOPMENT
- **Estimate**: 6 h
- **Depends on**: AV-079, AV-151, AV-146, AV-124
- **Description**: Playwright (dev-only dependency) smoke tests with a mocked OAuth provider and Mercado Pago sandbox test users: sign up, subscribe (test card), take a lesson, take a quiz, add aircraft, log a flight, run an uploaded checklist, plan a flight, export data.
- **Acceptance criteria**:
  - [ ] Smoke suite passes locally against Docker PostgreSQL 10
  - [ ] Suite runs in under 5 minutes

#### AV-094 - Production build and Passenger configuration
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-029, AV-092
- **Description**: Final production config: startup file, NODE_ENV=production, SPA fallback routing, static caching headers, log locations, pure-JS npm install on the server.
- **Acceptance criteria**:
  - [ ] Deep links (e.g. /aircraft/123) load correctly after refresh
  - [ ] App restarts cleanly from the cPanel Node.js App screen

#### AV-095 - Production release and runbook
- **Category**: ADMINISTRATIVE
- **Estimate**: 3 h
- **Depends on**: AV-094, AV-091
- **Description**: Create the production DB and user, set environment variables in cPanel (OAuth, Mercado Pago production credentials, secrets), register the production webhook endpoint, deploy, verify migrations, promote the admin account and smoke test. Update the docs/DEPLOYMENT.md runbook.
- **Acceptance criteria**:
  - [ ] Production smoke test passes
  - [ ] Runbook allows a redeploy without assistance

#### AV-096 - Backup policy and restore drill
- **Category**: ADMINISTRATIVE
- **Estimate**: 2 h
- **Depends on**: AV-095
- **Description**: Scheduled pg_dump via cPanel cron (or hosting backups), encrypted at rest and kept off-server, with a documented retention period consistent with the privacy policy. Uploaded files are backed up too. Run one restore test into a scratch DB.
- **Acceptance criteria**:
  - [ ] A daily backup is produced and stored encrypted off-server
  - [ ] The retention period is documented and matches the privacy policy
  - [ ] The restore drill succeeds and is documented

#### AV-097 - Retire legacy static pages
- **Category**: ADMINISTRATIVE
- **Estimate**: 1 h
- **Depends on**: AV-095, AV-002, AV-036, AV-185
- **Description**: Remove or redirect legacy HTML pages on the public site according to AV-002 (keep public landing page if decided).
- **Acceptance criteria**:
  - [ ] Old URLs redirect or return the decided content
  - [ ] No legacy page loads the old API key

#### AV-098 - Developer and API documentation
- **Category**: DEVELOPMENT
- **Estimate**: 3 h
- **Depends on**: AV-094
- **Description**: Update the root README, backend/README (endpoints, env vars, migrations, billing webhook setup) and frontend/README. Sync the Plans docs with any schema changes.
- **Acceptance criteria**:
  - [ ] A new developer can run the stack locally by following the README
  - [ ] Every endpoint is listed with method, path and auth requirement


---

## 7. Decisions

| # | Decision | Rationale | Status |
|---|----------|-----------|--------|
| D1 | Stack: React (Vite) + Node.js/Express 5 + `pg` plain SQL + PostgreSQL 10.23 + JWT + helmet/cors/dotenv; pure-JS packages only | Mandatory stack | Final |
| D2 | UUID v4 generated by the app (`crypto.randomUUID()`), stored in `UUID` columns | No pgcrypto needed; IDs cannot be enumerated | Final |
| D3 | The server is the source of truth; offline mode is in the backlog; sync columns stay reserved | Web stack | Proposed (Q6) |
| D4 | **Multi-user with public sign-up**. Roles are `student` (default) and `admin`; admins are promoted by CLI only | New SaaS vision | Final |
| D5 | **OAuth-only identity (Google, Facebook), no local passwords**. Accounts are linked only when the emails are verified; the last provider cannot be unlinked | Fewer stored secrets; no password reset flow | Final |
| D6 | **Sessions**: short-lived JWT in an httpOnly Secure **SameSite=Lax** cookie (Lax so the OAuth redirect works), jti in `user_session` for revocation, plus a CSRF double-submit token and Origin check | Resolves the earlier cookie-vs-header question; keeps the mandated JWT but adds revocation | Final |
| D7 | **Billing = Mercado Pago** subscriptions (preapproval) in **CLP** with signed webhooks, behind a provider-agnostic `BillingProvider` interface. Stripe and Flow.cl remain alternative adapters. Card data never reaches our servers (PCI SAQ-A). Use the official `mercadopago` SDK only if it is pure JS | The owner already has a Mercado Pago account; it supports recurring payments in Chile | Final |
| D8 | Webhooks: validate Mercado Pago `x-signature` (HMAC over data.id, x-request-id, ts), re-fetch the resource from the API, `billing_event` UNIQUE (provider, provider_event_id) for idempotency, transactional status update, out-of-order handling | Notifications are retried and can be duplicated or spoofed | Final |
| D9 | Subscription statuses are `trialing`, `active`, `past_due`, `canceled`, `incomplete`. Paid access applies to `trialing`/`active`, plus `past_due` during a grace period | Clear entitlement rules | Proposed (grace days in AV-102) |
| D10 | **Free vs paid (locked)**. FREE, no login: flight calculator, unit converter, METAR/TAF decoder, airspeed calculator. PAID (5,000 CLP/month): everything else (education, exams, logbook, flights, aircraft, charts, planning/estimates, checklists, reports). Entitlement middleware gates paid features | The free tools are the site's current traffic hook and the acquisition funnel | Final |
| D11 | Lesson HTML is sanitised server-side (`sanitize-html` allowlist); only YouTube/Vimeo embeds are allowed; videos are links, not uploads | XSS prevention; hosting bandwidth | Final |
| D12 | Exams: questions are snapshotted into the attempt; correct answers are never sent before submission; the deadline is enforced on the server | Integrity of results | Final |
| D13 | Derived flight values (total hours, hobbs/tach, automatic logbook entry) are computed in the service layer inside one transaction; there are no triggers | Testability; PG10 trigger pitfalls | Final |
| D14 | Enumerations use `TEXT + CHECK` instead of `ENUM` | PG10 cannot `ALTER TYPE ADD VALUE` inside a transaction | Final |
| D15 | Migrations are forward-only and idempotent, with one transaction per file, an advisory lock and a checksum | Safe for multiple Passenger workers | Final |
| D16 | Uploads (checklists, lesson assets, scans) go through one service: MIME sniffing + allowlist, size limits, random names outside the web root, owner-checked downloads | Secure upload surface | Final |
| D17 | Data minimisation: store only name, email, avatar URL and provider subject id from OAuth. No card data, no passwords. Audit log rows hold an IP hash, not the raw IP | Privacy by design | Final |
| D18 | All third-party keys stay on the backend; the leaked OpenWeatherMap key gets revoked (AV-003) | Secret hygiene | Final |
| D19 | Proposed libraries (all pure JS): `react-router-dom`, `i18next`/`react-i18next`, `chart.js`, `leaflet`, TipTap editor, `exceljs` or SheetJS, a pure-JS zip library for exports | Fits the no-native-modules constraint | Proposed |
| D20 | Proposed tests: `node:test` + `supertest`, Vitest + Testing Library, Playwright (dev-only), GitHub Actions with a `postgres:10` service | Pure-JS runners | Proposed |
| D21 | Same-origin deployment: Express serves the SPA, so cookies are first-party | Simplifies cookies, CSRF and CORS | Proposed (AV-001) |
| D22 | The UI defaults to Spanish, with English and Portuguese. Technical artifacts are in English; existing Plans docs stay in Spanish | User language rules | Final |
| D24 | **Runtime = Node.js 20** (cPanel provides 20.20.2); `engines: ">=20 <21"`; code kept compatible with Node 22 for an upgrade (see R1) | Confirmed by the owner | Final |
| D25 | **Regulatory basis = DGAC Chile (DAN/DAR)**; launch market Chile; `authority` + `regulation_reference` tagging with norm versions; norm changes flag content for review; FAA only as a reference | Confirmed by the owner; ready for other LATAM authorities | Final |
| D26 | **Content and question bank are authored by the owner** (flight instructor); tooling investment goes into the editor, import, versioning and review queue | Confirmed by the owner | Final |
| D27 | Privacy compliance targets Chile's Ley 19.628 and Ley 21.719 (data subject rights, consent, breach notification) and is **confirmed with legal counsel** | Launch market | Final (legal review pending) |
| D28 | **Price = 5,000 CLP per month, single monthly plan.** The plan model supports an optional free trial (`trial_days`, null = none); whether to offer a trial is still open | Confirmed by the owner | Final (trial open) |
| D23 | Phase order: foundations (identity/security) -> **free public tools hub shipped to production** -> billing -> education and evaluation -> operations modules -> planning -> checklists/reports -> release | The free tools bring traffic early; the paid area follows | Final |
| D29 | Free tools are **mobile-first, fast, shareable (inputs in URL query params), SEO-indexable**. Public routes are **prerendered at build time** with a pure-JS approach (react-dom/server or a Vite SSG plugin, no headless browser), with meta/OG tags, JSON-LD, sitemap.xml and robots.txt. Calculations run client-side; METAR/TAF goes through the backend proxy with caching and a per-IP rate limit. Each tool has a soft subscription CTA. Legacy URLs get 301 redirects | A React SPA alone is weak for SEO; keeps existing rankings | Final |
| D30 | The METAR/TAF decoder **ports and improves** the existing `decodeMetar` and the fetch/trend logic (`fetchMetar`, `fetchMetarHistory`, `analyzeMetarTrends`) instead of rewriting from zero | Reuse working code | Final |

---

## 8. Risks

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| R1 | **Node.js 20 reached end-of-life in April 2026**; the host's 20.20.2 will get no more security fixes | Security | Ask the host for Node 22/24 LTS; keep the code and CI Node 22-compatible; switch engines when available |
| R2 | PostgreSQL 10 has been end-of-life since Nov 2022 | Security/maintenance | Write SQL that also runs on newer versions; ask the host about upgrades; backups |
| R3 | Several Passenger workers migrate at the same time | Corrupted migrations | Advisory lock (AV-013) |
| R4 | The leaked OpenWeatherMap key is in git history (`js/config.js`) | Abuse or cost | Revoke now (AV-003) |
| R5 | Wrong aeronautical calculations or exam answers | Safety, liability, reputation | Reference tests, pilot review, disclaimers, a question review workflow |
| R6 | Mercado Pago preapproval limitations (status semantics, trial handling, notification delays, sandbox differences) | Wrong access or revenue loss | Re-fetch on every notification, reconciliation job (AV-126), sandbox E2E (AV-127); provider-agnostic module allows switching |
| R7 | Webhook mishandling (duplicates, out of order, missed events) | Wrong access | Idempotent event log, reconciliation job (AV-126) |
| R8 | OAuth lock-out (user loses their Google/Facebook account), or Facebook returns no email | Support load | Allow linking a second provider; never auto-link unverified emails |
| R9 | Facebook app review / Google consent verification delays | Launch delay | Register early (AV-104); Google-only launch fallback |
| R10 | Ley 19.628 / Ley 21.719 obligations (consent, data subject rights, breach notification to the new agency, international transfers to Google/Meta/Mercado Pago) | Legal | AV-105, AV-106, AV-160..AV-162, AV-174..AV-176; confirm with legal counsel |
| R11 | **Owner-authored content** is a large effort for one person | Courses and exams thin at launch | Authoring plan (AV-101), launch minimums per subject, good tooling (AV-134, AV-141, AV-172) |
| R17 | Public tools attract bot/scraper traffic on the weather proxy | Upstream quota exhaustion, cost | Cache, per-IP rate limit, ICAO validation (AV-032) |
| R12 | Shared hosting for a public SaaS (CPU/RAM limits, a single process, no horizontal scaling, in-memory rate limit) | Performance and availability | Monitor (AV-163); plan a move to a VPS if usage grows |
| R13 | Schema gaps for planning (airports, plan status) | Rework | AV-070, AV-076 |
| R14 | SII electronic invoicing (boleta) for subscriptions in Chile | Legal/finance | AV-103; confirm with an accountant |
| R15 | Copyright of educational material (e.g. reproducing third-party manuals) | Legal | Owner-written content; cite DAN/DAR as references |
| R16 | DGAC norm updates make content outdated | Wrong teaching or exams | Norm-change review workflow (AV-171) |

## 9. Open Questions (need the owner's answer)

Resolved: multi-user (D4), sessions (D6), payment provider = Mercado Pago (D7), Node 20 (D24), DGAC Chile (D25), content authored by the owner (D26), price 5,000 CLP/month (D28), free vs paid (D10).

1. **Trial**: offer a free trial or not, and how long? Also the past_due grace period. Price (D28) and free vs paid (D10) are fixed. (AV-102)
2. **Legal counsel**: who reviews the Terms/Privacy, the data subject rights flow and the breach procedure under Ley 19.628 / 21.719? Is a company entity needed for Mercado Pago and the OAuth apps? (AV-105)
3. **SII invoicing**: does Mercado Pago's receipt suffice, or must the app issue electronic boletas? (AV-103)
4. **Hosting limits**: PostgreSQL 10.23 access and the shared-hosting resource limits for a public SaaS; can the host offer Node 22/24? (AV-001, R1, R12)
5. **Typography and palette**: Roboto vs Roboto Thin, ROADMAP vs CHECKLIST palette. (AV-002)
6. **Reserved sync columns**: keep or drop? (AV-002)
7. **Airport data**: OurAirports import or manual coordinates (Chilean aerodromes)? (AV-070)
8. **Twitch / personal landing content**: keep in the public site or drop?

## 10. Conflicts Found in the Original Docs

| # | Conflict | Resolution |
|---|----------|------------|
| C1 | All docs described an offline, single-user Flutter/SQLite app without authentication | Now a multi-user SaaS web app with OAuth, roles and subscriptions |
| C2 | ROADMAP marks the Flutter base as done; the repo only holds static HTML | Treated as not done; rebuilt in P2 |
| C3 | Roboto vs Roboto Thin | Q5 |
| C4 | The colour palettes differ between ROADMAP and CHECKLIST | Q5 (ROADMAP by default) |
| C5 | "10 tables" vs a module mapping that adds up to 9; `checklist_template` and `flight_log` are grouped inconsistently | Checklists and flights are separate modules; the schema now has billing, education, evaluation and security tables |
| C6 | Tools timing differs between the docs | Ported tools in P6, after the core SaaS value |
| C7 | "16 unit types" vs 8 categories listed vs 7 categories in the prototype | AV-030 covers the union |
| C8 | Features without a schema (spare parts, scheduled flights, crew, airports, plan drafts) | Minimum covered by AV-070/AV-076; rest in backlog |
| C9 | The original SQL was SQLite-specific and had FK ordering problems | Rewritten for PG10 |
| C10 | "No authentication / no permissions" in ARCHITECTURE_NOTES vs the new SaaS scope | Replaced by OAuth + RBAC + entitlements |

---

## 11. Ideas / Backlog (not committed)

These are **not** part of the estimate above.

- **Offline mode / PWA with sync** - Service worker caching plus an offline write queue using the reserved synced_at/version/device_id/conflict_status columns; per-table conflict strategies from the original roadmap (manual for pilot/aircraft, LWW for logbooks, append-only flight_log).
- **Voice input / voice commands** - Hands-free data entry in the cockpit ('add 15 gallons', 'read takeoff checklist') via the Web Speech API.
- **Home-screen widgets** - Next flight, total hours, alerts and base weather widgets; requires PWA/native wrapper, not possible in a plain web app.
- **Smart notifications** - Pre-flight W&B reminder, post-flight logging reminder, maintenance and document reminders via Web Notifications or email.
- **Global search** - Unified search across aircraft, flights, logbook and checklists with filters, suggestions and history.
- **Interactive onboarding** - Wizard: welcome, pilot profile, first aircraft, module tour, initial preferences.
- **Quick actions and keyboard shortcuts** - Always-visible FAB (new flight, quick calculator, checklist) and shortcuts/gestures.
- **Templates and presets** - Saved frequent routes with calculations, aircraft performance presets (economy cruise, max range), checklist presets per flight type.
- **Smart night mode** - Automatic dark mode based on sunset/sunrise at the user's location.
- **Contextual help and tutorials** - Help icons, tooltips, 'what is this?' explanations and future video tutorials.
- **Progress indicators with cancel** - Progress bars, ETA and cancel for long exports and report generation.
- **Cloud backup integration** - Export/backup to Google Drive or Dropbox; full data export/import (JSON + documents ZIP).
- **NOTAMs integration** - Show NOTAMs for departure, destination and alternates in the planner.
- **Weather in the flight planner** - Attach METAR/TAF and winds aloft to plan legs automatically.
- **Spare parts management** - Listed under predictive maintenance in the roadmap but no table exists; needs schema design.
- **Scheduled flights and crew list** - Dashboard 'upcoming scheduled flights' and a crew list screen are mentioned in the roadmap but have no schema.
- **Predictive maintenance with ML** - Predict maintenance needs from usage history.
- **Route optimisation** - Suggest optimal routes/altitudes considering winds and fuel.
- **Financial reports and billing integration** - Operating cost analysis, financial reports and external billing systems.
- **Geolocation and moving map** - GPS position on the map during flight via the Geolocation API.
- **Public landing and Twitch integration** - Existing prototype index.html includes a personal landing page, courses and Twitch live/clips integration; could become a separate public site.
- **Visual trend comparisons** - Charts for hours evolution, fuel consumption per flight, plan vs actual performance and cost trends beyond the MVP reports.
- **Annual plans and coupons** - Yearly pricing, discount codes and school/group licences.
- **Instructor / flight school accounts** - Instructors follow students' progress and exam results; school-wide licences.
- **Spaced-repetition question review** - Re-ask previously failed questions on a spaced schedule.
- **Additional question types** - Multiple-answer, image hotspot and numeric-calculation questions beyond single-answer multiple choice.
- **Certificates of completion** - Downloadable certificates per subject or for the full ground-school course.
- **Discussion / Q&A per lesson** - Comments or questions per lesson, moderated by admins.
- **Additional login providers** - Apple and Microsoft sign-in.
- **Additional payment adapters** - Second provider adapter (Stripe or Flow.cl) behind the BillingProvider interface, e.g. for other countries.
- **Additional LATAM authorities** - Content and exams for other DGACs (Ecuador RDAC, Bolivia RAB, Peru RAP, etc.) using the authority/regulation_reference model, with per-country pricing and currency.
- **FAA cross-reference material** - Optional FAA references (PHAK, AIM) shown as complementary reading, never as the compliance basis.
