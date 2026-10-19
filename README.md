# Efficient Workflow

> **Snap a notice. Confirm the form. Get it serviced.**
> A platform that takes a small business from *"a customer got a notice"* to *"paid and closed"* with as little manual work as possible.

![status](https://img.shields.io/badge/status-demo-orange)
![next.js](https://img.shields.io/badge/Next.js-15-black)
![license](https://img.shields.io/badge/license-MIT-blue)

---

## Table of Contents

1. [Purpose](#purpose)
2. [How It Works](#how-it-works)
3. [Roles & Features](#roles--features)
4. [Order Lifecycle](#order-lifecycle)
5. [Dispatch Algorithm](#dispatch-algorithm)
6. [Tech Stack](#tech-stack)
7. [Architecture & Infrastructure](#architecture--infrastructure)
8. [Data & Security](#data--security)
9. [Repository Structure](#repository-structure)
10. [Getting Started](#getting-started)
11. [Developer Tools](#developer-tools)
12. [CI/CD & Deployment](#cicd--deployment)
13. [Maintenance & Operations](#maintenance--operations)
14. [Roadmap](#roadmap)

---

## Purpose

Small service businesses (inspection, repair, compliance, cleaning, etc.) lose hours every week to re-typing paperwork, phone tag, scheduling, and chasing payments.

**Efficient Workflow** removes that busywork:

| Goal | How |
|------|-----|
| **Less time** | Customers photograph a government/official notice; AI extracts the details and fills the service request form automatically. |
| **More revenue** | Requests are dispatched automatically to the nearest qualified business, so fewer jobs are missed and staff spend more time on billable work. |
| **Best service** | Everyone can see where each job stands, from submission to payment. Customers confirm the work is done before payment is requested. |

---

## How It Works

```mermaid
sequenceDiagram
    autonumber
    actor U as End User
    participant W as Web App (Next.js)
    participant AI as Extraction Service (AI Vision)
    participant H as Business Hub (Dispatch)
    actor B as Business Owner / Staff
    participant P as Payments (Stripe / PayPal / Apple Pay)

    U->>W: Scan QR code → open site
    U->>W: Upload photo of notification
    W->>AI: Image → structured fields
    AI-->>W: Name, address, notice ID, service type, due date…
    W-->>U: Pre-filled form
    U->>W: Review, edit, click **Confirm**
    W->>H: Submit request
    W-->>U: Confirmation (email / SMS, per preference)
    H->>H: Rank businesses by distance + service type + capacity
    H->>B: Offer job
    B->>H: Accept → schedule
    B->>W: Mark done + upload completion photos
    W-->>U: "Please verify the work"
    U->>W: Verify
    W->>P: Payment request
    U->>P: Pay
    P-->>W: Webhook: payment succeeded
    W-->>B: Payment received → deal closed
```

---

## Roles & Features

Access is role-based (RBAC). A user can hold more than one role (e.g. an owner who also works as staff).

### 1. End User (customer)
- Scan a **QR code** to open the site. No app install needed.
- **Upload a photo** of a notification (e.g. a government notice).
- **Auto-filled form** built from the extracted information.
- **Review & approve** before anything is submitted.
- **Confirmation by email or SMS**, depending on the user's preference.
- **Track progress** in real time.
- **Verify the work is finished**, then pay with Stripe, PayPal, or Apple Pay.
- Sign in with a **passkey**. No password required.

### 2. Business Hub / Dispatch Center
- **Automatic dispatch** based on distance, service type, and availability.
- Manual override: re-assign or dispatch by hand.
- Tracks accept/decline and escalates on timeout.
- **Progress tracking** across the full [lifecycle](#order-lifecycle).
- Holds payment until the customer verifies the work.

### 3. Business Owner
- Receive and **accept order offers**.
- **Schedule** jobs and assign them to staff.
- Mark a job **done** and **submit completion images**.
- **Receive payment** (Stripe Connect / PayPal payouts).
- **CRM**: customer history, notes, repeat-service reminders.
- Optional **Google Sheets sync** for owners who already work in spreadsheets.

### 4. Business Staff
- View assigned jobs and a daily route.
- Update job status from mobile and upload photos.
- Limited to the jobs assigned to them. Staff cannot see financials.

### 5. System Admin
- **Review everything**: users, businesses, orders, and the audit log.
- **Revenue management**: platform fees, payouts, refunds, and reports.
- **AI agent** (assistant): answers questions in plain English ("Which businesses missed SLA this week?"), flags anomalies, and drafts follow-ups.
- Manage service types, coverage areas, and feature flags.

---

## Order Lifecycle

Each order is a **finite-state machine**. Every transition is validated on the server, logged to an append-only audit table, and triggers notifications.

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED: User confirms form
    SUBMITTED --> PROCESSING: Validation & enrichment
    PROCESSING --> DISPATCHING: Ready for matching
    DISPATCHING --> ACCEPTED: Business accepts
    DISPATCHING --> DISPATCHING: Declined / timeout → next candidate
    ACCEPTED --> SCHEDULED: Date & staff assigned
    SCHEDULED --> FINISHED: Work done + photos uploaded
    FINISHED --> VERIFIED: Customer verifies work
    FINISHED --> SCHEDULED: Customer disputes → rework
    VERIFIED --> PAYMENT_REQUESTED
    PAYMENT_REQUESTED --> PAID: Customer pays
    PAID --> PAYMENT_RECEIVED: Payout settled to business
    PAYMENT_RECEIVED --> CLOSED: Deal closed
    CLOSED --> [*]

    SUBMITTED --> CANCELLED
    PROCESSING --> CANCELLED
    DISPATCHING --> CANCELLED
```

| # | Status | Who moves it | Notification |
|---|--------|-------------|--------------|
| 1 | `SUBMITTED` | End user | User: "We received your request" |
| 2 | `PROCESSING` | System | None |
| 3 | `DISPATCHING` | System | Business: new job offer |
| 4 | `ACCEPTED` | Business owner | User: "A business accepted your request" |
| 5 | `SCHEDULED` | Owner / staff | User: appointment details |
| 6 | `FINISHED` | Staff / owner | User: "Please verify the work" |
| 7 | `VERIFIED` | End user | Business: "Customer verified" |
| 8 | `PAYMENT_REQUESTED` | System | User: payment link |
| 9 | `PAID` | Payment webhook | Both parties: receipt |
| 10 | `PAYMENT_RECEIVED` | Payout webhook | Business: "Funds received" |
| 11 | `CLOSED` | System | User: review / feedback request |

---

## Dispatch Algorithm

Implemented in [`packages/dispatch`](packages/dispatch) as a pure, unit-tested module. It runs as a background job, not inside the request.

**1. Filter** to eligible businesses:
- The business offers the requested `service_type`.
- The job address is inside the business's service area (PostGIS `ST_DWithin`).
- The business is active, verified, and has capacity on or before the due date.

**2. Score** each candidate (weights are configurable by an admin):

```
score = w_d · (1 − distance / max_radius)
      + w_r · rating_normalized
      + w_c · capacity_available
      + w_a · acceptance_rate
```

Distance is calculated with PostGIS (`ST_Distance` on `geography`). Drive-time from a routing API can be added later.

**3. Offer** the job to the top candidate, who has a configurable window to accept (default 15 min). If they decline or time out, the job goes to the next candidate. After *N* misses it is escalated to manual dispatch in the admin console.

**4. Record** every offer and response so the weights can be tuned later.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 15 (App Router)** + **React 19** + **TypeScript** | File-based routing, server components, and SSR/SSG for SEO |
| UI / Styling | **Material UI (MUI v6)** + Emotion | Accessible, ready-made components that look consistent with little effort |
| Design | **Figma** (GFE design files) | Source of truth for UI. Tokens are exported to the MUI theme |
| Forms | React Hook Form + **Zod** | One schema validates on both client and server |
| Data fetching | **REST API** (Next.js Route Handlers) + TanStack Query | Simple and cacheable. An OpenAPI spec is generated from the Zod schemas |
| Database | **PostgreSQL 16** + **PostGIS** | Relational integrity plus geospatial queries for dispatch |
| ORM / migrations | **Prisma** | Type-safe queries and versioned migrations |
| Spreadsheet sync | **Google Sheets API** | Optional per-business export. Postgres stays the source of truth |
| Image → form | AI vision model (Claude, `claude-sonnet-5-5`) with structured JSON output | Pulls fields out of photos of notices. Confidence scores highlight fields the user should check |
| File storage | Vercel Blob (or S3) | Notice and completion photos. Private by default, served through signed URLs |
| Auth | **Auth.js** + **Passkeys (WebAuthn)** | Phishing-resistant, password-free sign-in. Email magic link as fallback |
| Payments | **Stripe** (incl. **Apple Pay**), **PayPal**, Stripe Connect for payouts | Covers the most common ways customers pay |
| Notifications | Resend (email), Twilio (SMS) | Sent through whichever channel the user prefers |
| Background jobs | Inngest (or Upstash QStash) | Dispatch, retries, timeouts, webhook fan-out |
| Cache / rate limit | Upstash Redis | Rate-limits the upload and extraction endpoints |
| Hosting | **Vercel** | Preview deploy for every PR, edge CDN, serverless functions |

> **Note on Vite:** Next.js has its own compiler (Turbopack), so the app is not built with Vite. Vite powers **Vitest** (unit tests) and **Storybook** (component workshop) in this repo.

---

## Architecture & Infrastructure

```mermaid
flowchart LR
    subgraph Client
      A[Browser / Mobile Web<br/>QR → PWA]
    end

    subgraph Vercel
      B[Next.js App<br/>RSC + Route Handlers]
      C[Edge Middleware<br/>auth, RBAC, rate limit]
    end

    subgraph Services
      D[(PostgreSQL + PostGIS)]
      E[(Blob Storage<br/>images)]
      F[Redis<br/>cache & rate limit]
      G[Job Queue<br/>Inngest]
      H[AI Vision<br/>extraction]
    end

    subgraph Third-party
      I[Stripe / Apple Pay]
      J[PayPal]
      K[Resend / Twilio]
      L[Google Sheets]
      M[Sentry / Logs]
    end

    A --> C --> B
    B --> D
    B --> E
    B --> F
    B --> G
    G --> H
    G --> D
    G --> K
    G --> L
    B <--> I
    B <--> J
    I -- webhooks --> B
    J -- webhooks --> B
    B --> M
```

**Rendering strategy**

| Route group | Strategy | Reason |
|-------------|----------|--------|
| `/(marketing)` – landing, services, city pages | **SSG + ISR** | SEO and speed |
| `/request` – upload & form | SSR shell + client components | Fast first paint; the form itself is interactive |
| `/dashboard/*` – owner, staff, admin | Dynamic SSR, authenticated | Personalized, never cached publicly |
| `/api/*` | REST Route Handlers | Validated with Zod; versioned under `/api/v1` |

**Environments**

| Env | Branch | URL | Database |
|-----|--------|-----|----------|
| Preview | any PR | `*.vercel.app` | Neon database branch per PR |
| Staging | `develop` | `staging.example.com` | Staging DB (synthetic data) |
| Production | `main` | `app.example.com` | Production DB (PITR enabled) |

**Scalability**
- Stateless serverless functions scale out automatically on Vercel.
- Slow work (AI extraction, dispatch, notifications, Sheets sync) runs in queued jobs, so user requests stay fast.
- Postgres uses connection pooling (PgBouncer/Neon pooler), indexes on `status`, `business_id`, and `created_at`, and a GiST index on location.
- Read-heavy pages are cached with ISR and Redis.

---

## Data & Security

The platform stores **commercially sensitive data**: customer PII, official notices, business pricing, and payment records. Security is treated as a core feature.

| Area | Measures |
|------|----------|
| **Authentication** | Passkeys (WebAuthn) first; short-lived sessions; MFA required for admins |
| **Authorization** | RBAC checked in middleware **and** in every handler; Postgres Row-Level Security as a second layer |
| **Data at rest** | Managed Postgres with encryption at rest; sensitive columns (e.g. notice IDs, phone numbers) encrypted at the application level |
| **Data in transit** | TLS everywhere; HSTS; strict CSP |
| **Files** | Private bucket; time-limited signed URLs; EXIF/GPS metadata stripped on upload; file type and size validated |
| **Payments** | Card data never touches our servers (Stripe Elements / PayPal SDK) → PCI scope SAQ-A; webhooks verified by signature and processed idempotently |
| **AI extraction** | Images sent only to the extraction provider, under a no-training data policy; output validated with Zod; the user always confirms before submitting |
| **Google Sheets** | Opt-in per business; minimal fields only; OAuth scopes limited to the specific sheet |
| **Auditing** | Append-only `audit_log` for every status change and admin action |
| **App security** | OWASP Top 10 checks, rate limiting, CSRF protection, input validation, dependency and secret scanning in CI |
| **Privacy** | Data-retention policy, user data export/delete endpoints (GDPR/CCPA-ready) |

**Core data model (simplified)**

```
users(id, email, phone, notify_pref, roles[])
businesses(id, owner_id, name, location geography, service_area geography, rating, active)
service_types(id, name)
business_services(business_id, service_type_id, base_price)
orders(id, customer_id, business_id, service_type_id, status, address, location geography,
       extracted_data jsonb, due_date, scheduled_at, created_at)
order_events(id, order_id, from_status, to_status, actor_id, created_at)
attachments(id, order_id, kind[notice|completion], blob_key)
dispatch_offers(id, order_id, business_id, score, status, expires_at)
payments(id, order_id, provider, provider_ref, amount, currency, status)
audit_log(id, actor_id, action, entity, entity_id, diff jsonb, created_at)
```

---

## Repository Structure

pnpm workspace + Turborepo monorepo:

```
efficient-workflow/
├── apps/
│   └── web/                    # Next.js app
│       ├── app/
│       │   ├── (marketing)/    # SSG landing & SEO pages
│       │   ├── request/        # QR landing → upload → review → confirm
│       │   ├── track/[id]/     # Customer progress tracking
│       │   ├── dashboard/
│       │   │   ├── owner/
│       │   │   ├── staff/
│       │   │   └── admin/
│       │   └── api/v1/         # REST route handlers
│       ├── components/
│       ├── lib/                # auth, rbac, payments, notifications
│       └── middleware.ts
├── packages/
│   ├── ui/                     # MUI theme + shared components (Storybook)
│   ├── db/                     # Prisma schema, migrations, seed
│   ├── dispatch/               # Matching & scoring algorithm
│   ├── extraction/             # Image → structured form data
│   ├── workflow/               # Order state machine
│   └── config/                 # eslint, tsconfig, prettier presets
├── e2e/                        # Playwright tests
├── .github/workflows/          # CI/CD
├── docker-compose.yml          # Local Postgres+PostGIS, Redis, Mailpit
└── turbo.json
```

---

## Getting Started

### Prerequisites
- Node.js 22+ and pnpm 10 (`corepack enable` picks up the version pinned in `package.json`)
- Docker (for local Postgres, Redis, and Mailpit)
- An Anthropic API key, for photo extraction. Without one you can still fill the form in by hand.

### Install

```bash
git clone https://github.com/<org>/efficient-workflow.git
cd efficient-workflow
pnpm install

cp apps/web/.env.example apps/web/.env.local   # set ANTHROPIC_API_KEY (see below)
cp packages/db/.env.example packages/db/.env   # DATABASE_URL for the Prisma CLI

docker compose up -d            # postgres+postgis, redis, mailpit
pnpm db:migrate                 # create tables (first run asks for a migration name, e.g. "init")
pnpm db:seed                    # demo users, a business, service types
```

### Run

```bash
# Development (hot reload). Generates the Prisma client first.
pnpm dev                        # http://localhost:3000

# Production build, run locally
pnpm build
pnpm --filter @ew/web start     # http://localhost:3000

# Checks
pnpm test                       # unit tests (workflow, dispatch, extraction)
pnpm typecheck
curl localhost:3000/api/health  # {"ok":true} when the database is reachable

# Stop local services
docker compose down             # add -v to also delete the database volume
```

### Demo

The MVP demo covers **QR → upload → AI autofill → confirm → status tracking**.

**In the browser**

1. Open <http://localhost:3000> and click **Start a request**, or go straight to <http://localhost:3000/request>. That's the URL a printed QR code would point to.
2. Click **Take or upload a photo** and choose a photo of a notice (an inspection letter, a compliance notice, etc.).
3. Review the pre-filled form. Fields the AI wasn't sure about are highlighted in orange. Add an email or phone number, then click **Confirm request**.
4. You land on `/track/<order id>`, which shows the order at **Request received**.

No API key? Click **Skip and fill in by hand** in step 2. The rest of the flow works the same.

**On your phone** (same Wi-Fi as your computer):

```bash
pnpm --filter @ew/web dev --hostname 0.0.0.0
# then open http://<your-computer's-LAN-IP>:3000/request on the phone
```

The camera opens directly from the upload button.

**From the command line**

```bash
# 1. Extract fields from a photo
curl -F "image=@notice.jpg;type=image/jpeg" localhost:3000/api/v1/extract

# 2. Create an order (normally the browser sends this after you confirm)
curl -X POST localhost:3000/api/v1/orders \
  -H 'content-type: application/json' \
  -d '{
    "contactName": "Blue Door Cafe", "contactEmail": "owner@bluedoor.test", "contactPhone": "",
    "notifyPref": "EMAIL",
    "address": {"line1": "12 Main St", "line2": "", "city": "Springfield", "state": "IL", "postalCode": "62701"},
    "serviceType": "fire_safety_inspection",
    "issuingAuthority": "Springfield Fire Department", "noticeId": "FS-2026-0412",
    "dueDate": "2026-11-15", "notes": "", "extraction": null
  }'
# → {"id":"<order id>"}; open http://localhost:3000/track/<order id>

# 3. Browse the data
pnpm db:studio                  # Prisma Studio at http://localhost:5555
```

### Demo accounts (seeded)

| Role | Email |
|------|-------|
| End user | `customer@demo.local` |
| Business owner | `owner@demo.local` |
| Staff | `staff@demo.local` |
| Admin | `admin@demo.local` |

### Environment variables

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/efficient_workflow
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI extraction
ANTHROPIC_API_KEY=

# Storage
BLOB_READ_WRITE_TOKEN=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=

# Notifications
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Jobs / cache
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Google Sheets (optional)
GOOGLE_SERVICE_ACCOUNT_JSON=

# Observability
SENTRY_DSN=
```

### Common scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all apps in dev mode |
| `pnpm build` | Production build (Turborepo cached) |
| `pnpm format` | Prettier |
| `pnpm typecheck` | `tsc --noEmit` across workspaces |
| `pnpm test` | Vitest unit tests |
| `pnpm db:generate` | Regenerate the Prisma client after editing `schema.prisma` |
| `pnpm db:migrate` / `db:seed` / `db:studio` | Prisma migrate / seed demo data / Prisma Studio |

Planned, not yet set up: `pnpm lint` (ESLint), `pnpm test:e2e` (Playwright), `pnpm storybook`, and `stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe` for testing Stripe webhooks.

---

## Developer Tools

| Purpose | Tool |
|---------|------|
| Package manager / monorepo | pnpm workspaces + **Turborepo** (remote cache on Vercel) |
| Language | TypeScript (strict) |
| Lint / format | ESLint (flat config), Prettier |
| Git hooks | Husky + lint-staged + commitlint (Conventional Commits) |
| Unit / integration tests | **Vitest** + Testing Library; Testcontainers for Postgres |
| E2E tests | **Playwright** (upload → confirm → dispatch → pay flow) |
| Component dev | **Storybook** (Vite builder) + Chromatic visual regression |
| API docs | OpenAPI generated from Zod (`zod-openapi`), served at `/api/docs` |
| Design handoff | Figma → design tokens → MUI theme |
| Local services | Docker Compose, Mailpit (email capture), Stripe CLI |
| Dependency updates | Renovate / Dependabot |
| AI assist | Claude Code for code generation, review, and refactors |

**Conventions**
- Branches: `feat/*`, `fix/*`, `chore/*` → PR into `develop` → release PR into `main`.
- Commits follow Conventional Commits; the changelog and versions are generated by Changesets.
- Every PR needs passing CI, one approving review, and a working Vercel preview.

---

## CI/CD & Deployment

```mermaid
flowchart LR
    PR[Pull Request] --> CI{GitHub Actions CI}
    CI --> L[Lint + Typecheck]
    CI --> U[Unit tests<br/>Vitest]
    CI --> S[Security<br/>CodeQL, audit, gitleaks]
    CI --> B[Build]
    B --> PV[Vercel Preview<br/>+ Neon DB branch]
    PV --> E2E[Playwright E2E<br/>against preview]
    E2E --> RV[Code review]
    RV -->|merge| DEV[develop → Staging]
    DEV -->|release PR| MAIN[main]
    MAIN --> MIG[prisma migrate deploy]
    MIG --> PROD[Vercel Production]
    PROD --> SM[Smoke tests + Sentry release]
```

### GitHub Actions workflows (`.github/workflows/`)

| Workflow | Trigger | Steps |
|----------|---------|-------|
| `ci.yml` | PR, push | install (cached) → lint → typecheck → Vitest (with coverage) → build |
| `e2e.yml` | Vercel `deployment_status` | Playwright against the preview URL; uploads traces on failure |
| `security.yml` | PR + weekly | CodeQL, `pnpm audit`, gitleaks secret scan, dependency review |
| `db-migrate.yml` | push to `develop` / `main` | `prisma migrate deploy` against staging / prod (with manual approval for prod) |
| `release.yml` | push to `main` | Changesets version + changelog, Sentry release, tag |
| `storybook.yml` | PR touching `packages/ui` | Chromatic visual diff |

### Deployment
- **Vercel** builds and deploys automatically:
  - every PR gets a **preview** deployment
  - `develop` deploys to **staging**
  - `main` deploys to **production**
- Secrets live in Vercel Environment Variables and GitHub Encrypted Secrets, never in the repo.
- Database migrations run *before* the production deploy is promoted. They must be backwards-compatible (expand → migrate → contract).
- **Rollback**: Vercel instant rollback to the previous deployment. Feature flags let a feature be switched off without redeploying.

---

## Maintenance & Operations

| Area | Practice |
|------|----------|
| **Monitoring** | Sentry (errors + performance), Vercel Analytics & Speed Insights, uptime checks on `/api/health` |
| **Logging** | Structured JSON logs with request IDs; PII is redacted |
| **Alerting** | Alerts for error-rate spikes, dispatch queue backlog, failed webhooks, and payment mismatches |
| **Backups** | Managed Postgres point-in-time recovery (7–30 days); restores tested monthly |
| **Dependencies** | Renovate opens weekly batched update PRs; security patches are auto-merged when CI passes |
| **Migrations** | Versioned Prisma migrations; reviewed in the PR; never edited after merge |
| **Payments reconciliation** | Nightly job compares Stripe/PayPal records with the `payments` table and flags any mismatch |
| **Data retention** | Notice images purged after N days post-close (configurable); audit log retained per policy |
| **Performance budgets** | Lighthouse CI: LCP < 2.5s, CLS < 0.1, JS bundle budget per route |
| **Incident response** | Runbooks in `/docs/runbooks`; post-mortems for Sev-1/Sev-2 incidents |
| **Access reviews** | Quarterly review of admin accounts and API keys; keys rotated regularly |

---

## Roadmap

- [ ] **MVP demo**: QR → upload → AI autofill → confirm → manual dispatch → status tracking
- [ ] Automatic distance-based dispatch with accept/decline timeouts
- [ ] Stripe + Apple Pay checkout; Stripe Connect payouts
- [ ] PayPal integration
- [ ] Passkey sign-in
- [ ] Owner CRM + Google Sheets sync
- [ ] Admin revenue dashboard
- [ ] Admin AI agent (natural-language ops queries)
- [ ] Drive-time routing and multi-stop staff routes
- [ ] Multi-language support for notices and UI

---

## License

MIT © Efficient Workflow contributors
