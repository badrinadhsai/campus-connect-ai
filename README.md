# Campus Connect AI

> A full-stack campus grievance & complaint management platform for **Vignan University**, powered by AI.

Campus Connect AI is a complaint/grievance redressal system that lets students raise campus issues
(hostel, classrooms, Wi-Fi, water, electricity, etc.), lets staff track and resolve assigned tasks,
and gives admins oversight through analytics, audit logs, and staff management. An integrated
**Gemini AI assistant** automatically classifies incoming complaints by category, priority, and
responsible department, and drafts a suggested action plan.

---

## Problem It Solves

University campuses generate a high volume of scattered complaints — broken projectors, water
leaks, Wi-Fi outages, lost items — that traditionally get lost in WhatsApp groups and email threads.
Campus Connect AI provides a single, structured pipeline:

- **Students** get a clean way to file complaints with categories, priorities, location, and attachments.
- **Staff** get a work queue with assignment, status updates, proof uploads, and internal comments.
- **Admins** get SLA tracking, analytics dashboards, audit trails, and CSV exports.
- **AI** removes triage friction by auto-categorizing and routing every new complaint.

---

## Key Features

- **Role-based dashboards** — separate experiences for `STUDENT`, `STAFF`, and `ADMIN`.
- **Complaint lifecycle** — `Submitted → Verified → Under Review → Assigned → In Progress → Resolved → Closed`, plus `Rejected`.
- **AI auto-classification** — `/api/ai/suggest` uses Gemini (with a deterministic keyword fallback) to suggest category, priority, department, and action.
- **Upvotes & comments** — students can upvote complaints; staff/admins can add public and internal comments.
- **Notifications** — in-app notifications for new complaints, assignments, and status changes.
- **Audit logs** — every important action is recorded for accountability.
- **Analytics** — total/pending/resolved counts, SLA breach tracking, category/priority/department distributions, monthly trends, and staff performance.
- **CSV export** — one-click export of all complaints.
- **Email notification log** — server-side dispatch log for status-change emails.
- **Supabase backend** — PostgreSQL persistence with a provided schema + migration.
- **Graceful offline mode** — if Supabase/Gemini credentials are absent, the app falls back to an in-memory demo store so the UI still runs.

---

## Technology Stack

| Layer        | Technology |
|--------------|------------|
| Frontend     | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| UI / Charts  | lucide-react, recharts, motion |
| Backend      | Node.js, Express 4 |
| AI           | Google Gemini (`@google/genai`, `gemini-2.5-flash`) |
| Database     | Supabase (PostgreSQL) via `@supabase/supabase-js` |
| Auth/Hashing | Supabase Auth + bcryptjs |
| Dev tooling  | tsx, esbuild, TypeScript |

---

## Project Architecture

```
campus-connect-ai/
├── server.ts                     # Express API + Vite dev middleware / static prod server
├── src/
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # App shell & routing
│   ├── index.css                 # Global styles (Tailwind)
│   ├── types.ts                  # Shared TypeScript models
│   ├── data/initialData.ts       # Seed/demo data
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client (env-driven, in-memory fallback)
│   │   └── supabaseDb.ts         # Database access layer (complaints, users, audit, notifications)
│   ├── services/api.ts           # Frontend API client
│   └── components/
│       ├── landing/  auth/  layout/  common/
│       ├── student/  staff/  admin/  analytics/
│       └── notifications/  docs/
├── supabase/
│   ├── schema.sql                # Full database schema
│   └── migrations/               # Versioned SQL migrations
├── assets/.aistudio/             # AI Studio workspace metadata
├── index.html                    # Vite HTML entry
├── vite.config.ts                # Vite + Tailwind config
├── tsconfig.json                 # TypeScript config
├── package.json                  # Scripts & dependencies
├── bun.lock                      # Lockfile (bun)
├── .env.example                  # Example environment variables
└── .gitignore
```

The Express server (`server.ts`) hosts the REST API under `/api/*` and, in development, mounts Vite
as middleware so the React app and API are served from a single origin (`http://localhost:3000`).
In production it serves the built `dist/` folder.

---

## Prerequisites

- **Node.js** 18+ (tested on Node 24)
- **npm** (or **bun**) for installs
- A **Supabase** project (optional for demo mode; required for real persistence)
- A **Gemini API key** (optional; app falls back to rule-based classification without it)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/badrinadhsai/campus-connect-ai.git
cd campus-connect-ai

# Install dependencies
npm install
# (or: bun install)
```

---

## Environment Variable Setup

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable                     | Required | Description |
|------------------------------|----------|-------------|
| `GEMINI_API_KEY`             | Optional | Google Gemini API key for AI suggestions. Without it, a keyword-based fallback is used. |
| `APP_URL`                    | Optional | Public URL of the deployed app (OAuth/callback self-links). |
| `VITE_SUPABASE_URL`          | Optional | Supabase project URL. If empty, the app runs in in-memory demo mode. |
| `VITE_SUPABASE_ANON_KEY`     | Optional | Supabase anon/public key. |
| `SUPABASE_SERVICE_ROLE_KEY`  | Optional | Supabase service-role key (server-side, privileged). Keep secret. |

> **Never commit your real `.env` file.** It is already covered by `.gitignore`.

---

## How to Run Locally

```bash
# Start the dev server (Express + Vite on http://localhost:3000)
npm run dev
```

Then open **http://localhost:3000** in your browser.

---

## How to Build

```bash
# Production build: Vite bundle (dist/) + bundled server (dist/server.cjs)
npm run build

# Run the production server
npm start
```

Other scripts:

```bash
npm run preview   # Preview the production frontend build
npm run lint      # Type-check with tsc --noEmit
npm run clean     # Remove dist/ and server bundle
```

---

## How to Deploy

1. Set the environment variables (above) in your hosting provider.
2. Run `npm run build` to produce `dist/` and `dist/server.cjs`.
3. Launch with `npm start` (serves the API and static frontend on port `3000`).
4. For Supabase-backed deployments, run the SQL in `supabase/schema.sql` (and the migration under
   `supabase/migrations/`) against your Supabase project first.

The app is structured to deploy as a single Node service (API + static SPA) — suitable for Cloud Run,
Render, Fly.io, Railway, or any Node host.

---

## Important API / AI Configuration

- **AI endpoint:** `POST /api/ai/suggest` — accepts `{ title, description }` and returns
  `{ category, priority, department, suggestedAction, reasoning, refinedSummary }`.
  Uses `gemini-2.5-flash` when `GEMINI_API_KEY` is set; otherwise returns a deterministic
  keyword-based classification.
- **Supabase seeding:** on boot, `initializeSupabaseDatabase()` creates required tables and seeds
  default categories if they do not exist.
- **Server port:** `3000` (configurable in `server.ts`).

---

## Demo

> No public demo — run locally (see Installation above). With no Supabase/Gemini credentials the app runs in in-memory demo mode with seed data.

---

## Screenshots

> Screenshots are not included in this repository. Add images under `assets/` and link them here.

---

## Limitations

- Role checks are light (mostly client-side); server-side RBAC enforcement is still needed before any real deployment.
- Email delivery is an in-memory dispatch log, not real SMTP.
- Attachments are metadata only; file storage via Supabase Storage is not implemented.
- AI classification quality has not been evaluated on a labeled set; the keyword fallback is deterministic but crude.
- No automated tests; large initial JS bundle (see Future Improvements).

---

## What I Learned

- Modeling a multi-role workflow (Student/Staff/Admin) with a single complaint lifecycle state machine.
- Calling an LLM (Gemini) for structured classification output with a deterministic fallback when the key is absent.
- Structuring an Express + Vite single-origin app for dev and production.
- Designing a Supabase/Postgres schema with migrations, audit logs, and seed data.
- Building analytics (SLA tracking, distributions, trends) directly on operational data.

---

## Future Improvements

- Real email delivery (SMTP / provider) instead of the in-memory dispatch log.
- File/attachment storage via Supabase Storage.
- Role-based access control enforced server-side (currently role checks are light).
- OAuth providers (Google) for SSO.
- Real-time notifications via Supabase Realtime.
- Code-splitting to address the large initial JS bundle warning.

---

## License

This project is provided as-is for educational / internal campus use. Add a `LICENSE` file if you
intend to publish it under a specific open-source license.

---

## Repository

GitHub: https://github.com/badrinadhsai/campus-connect-ai
