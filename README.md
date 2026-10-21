# Dojo Hub MES

A Manufacturing Execution System (MES) built for Dojo Hub Uganda as part of the Dojo Hub 2026 Software Development Project. It records what actually happens on the factory floor, from raw material intake to finished goods, and gives executives, managers and operators each their own console.

## Features

**Executive**
- Create and deactivate Manager accounts
- Create Production Lines and assign each to a Manager
- Overview dashboard with live line, manager and critical alert counts
- Historical analytics: job timelines, fault analytics, scrap tracking and operator activity, with date filtering and CSV export

**Manager**
- Operations dashboard with assigned lines, live job monitor and a fault alert feed
- Blueprint Library: reusable process templates with configurable guidelines, checklist, quantity logging, QC form and fault categories
- Job Builder: assemble jobs from blueprints, assign operators and activate
- Operator Roster: register operators with a phone number, PIN and skill tags
- Fault Records with resolve actions

**Operator**
- Phone and PIN login
- List of assigned process stages
- Start, pause, resume and end controls with timestamps
- Checklist, quantity batches, QC answers, operator notes, scrap logging and fault reporting
- End is blocked until mandatory checklist and QC items are complete

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, React Router |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Data access | Prisma ORM |
| Authentication | JSON Web Tokens (JWT) with role-scoped middleware |

## Project Structure

```
MES/
├── backend/
│   ├── prisma/          # schema.prisma, migrations, seed.js
│   ├── src/
│   │   ├── config/      # Prisma client
│   │   ├── controllers/
│   │   ├── middleware/  # auth + role guard
│   │   ├── routes/
│   │   └── utils/       # JWT helpers
│   └── index.js
└── frontend/
    └── src/
        ├── api/         # fetch wrapper that attaches the JWT
        ├── context/     # AuthContext
        └── pages/       # Executive, Manager and Operator screens
```

## Getting Started

### Prerequisites
- Node.js (LTS)
- PostgreSQL running locally

### 1. Backend

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and fill in your values:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/mes_dev?schema=public"
JWT_SECRET="a-long-random-string"
PORT=5000
```

Create the database tables, seed the first Executive account and start the server:

```bash
npx prisma migrate dev
node prisma/seed.js
npm run dev
```

The API runs at `http://localhost:5000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The frontend expects the API at `http://localhost:5000/api` (set in `frontend/src/api/client.ts`).

## First Login

There is no public sign-up by design. Accounts are created top-down:

1. The seed script creates the first **Executive** (`admin@dojohub.test` / `ChangeMe123!`). Change this password before using the system for anything real.
2. The Executive creates **Managers**.
3. Each Manager creates **Operators**.

## API Overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/operator-login` |
| Users | `POST /api/users/managers`, `POST /api/users/operators`, `GET /api/users/managers`, `GET /api/users/operators`, `PATCH /api/users/:id/deactivate` |
| Lines | `POST /api/lines`, `GET /api/lines`, `GET /api/lines/:id` |
| Blueprints | `POST /api/blueprints`, `GET /api/blueprints`, `PATCH /api/blueprints/:id/archive` |
| Jobs | `POST /api/jobs`, `GET /api/jobs`, `POST /api/jobs/:jobId/stages`, `PATCH /api/jobs/:jobId/activate` |
| Stages (operator) | `GET /api/stages/mine`, `GET /api/stages/:id`, `POST /api/stages/:id/start`, `pause`, `resume`, `end`, `PATCH /checklist`, `POST /qc`, `POST /batches`, `PATCH /notes` |
| Faults | `POST /api/faults`, `GET /api/faults`, `GET /api/faults/feed`, `GET /api/faults/critical`, `PATCH /api/faults/:id/resolve` |
| Scrap | `POST /api/scrap`, `GET /api/scrap` |
| Stats (executive) | `GET /api/stats/jobs`, `faults`, `scrap`, `operators` |
| Public | `GET /api/public/stats` |

All routes except login and public stats require a `Bearer` token, and each route is restricted to the roles allowed to use it.

## Design Notes

- **Blueprint snapshot rule:** when a blueprint is added to a job, a frozen copy is stored on the job stage, so later blueprint edits never change jobs in progress or completed.
- **Role separation:** executives cannot edit blueprints or resolve faults, managers cannot see the analytics suite, and operators only see stages assigned to them.
- **Operator activity** is descriptive only, with no scoring or ranking.

## Status and Roadmap

Working end to end: authentication, account management, production lines, blueprints, job assembly, operator execution, faults, scrap and executive analytics.

