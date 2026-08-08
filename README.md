# Performance Feedback Tool

A small multi-tenant tool for monthly manager → employee feedback across 5 fixed
parameters, built as a take-home. One login page, multiple pilot companies.

## Stack

- **Backend**: Node.js, Express, TypeScript, Prisma, SQLite. JWT auth (email + password).
- **Frontend**: React, TypeScript, Vite, React Router. No UI framework, no chart
  library — plain CSS and small hand-rolled bar visualizations, to keep the
  focus on the data model rather than polish.
- One React app serves both "apps" the brief asks for — an Employee/Manager
  view (`/`, `/give`) and an HR view (`/hr`) — gated by role flags returned
  from the API, rather than two separately deployed frontends. See
  *Assumptions* below.

## Data model

```
Company 1───* User (self-referential managerId) 1───* Feedback *───1 FeedbackScore *───1 FeedbackParameter
```

- **Company**: a pilot tenant. Every `User` and `Feedback` row is scoped to one.
- **User**: has a nullable, self-referential `managerId`. This single edge is
  the entire org chart — there's no separate "role" enum for
  manager/employee, because people are often both (Priya reports to Rohan
  *and* manages 6 people). "Is this person a manager?" is derived by asking
  whether anyone points `managerId` at them, not stored as a flag. The one
  real role flag is `isHR`, and it's scoped per-company: an HR lead at one
  pilot company has no visibility into another's data.
- **FeedbackParameter**: the 5 fixed parameters (ownership, communication,
  quality of work, collaboration, initiative), seeded once, shared platform-wide.
- **Feedback**: one row per (employee, calendar month) — a manager's full
  submission for that employee that period, covering all 5 parameters. A
  `@@unique([employeeId, period])` constraint is the load-bearing piece of the
  whole model: it's what makes "has this employee gotten feedback this month"
  a fact you can query directly instead of inferring from scattered rows, and
  it's what both the employee trend view and the HR "who's missing" view are
  built on.
- **FeedbackScore**: one row per (feedback, parameter) — the score (1-5) and
  the required comment explaining it.

### Why this holds up for the four scenarios in the brief

- **Ashoka Textiles' 3-deep chain** (COO → Rohan → Priya → 6 reports): just
  three `managerId` edges chained together. No schema change needed for
  depth — a chain of any length is the same shape.
- **Bright Path's flat structure** (founder → 8 people, no middle layer): the
  same edge, just with `managerId` pointing straight at the founder for
  everyone. Nothing special-cased for "no middle management."
  Note: the founder's own `managerId` is `null` — same as Ananya (the COO) at
  Ashoka. A person with no manager isn't a different kind of entity, just an
  edge that terminates.
- **Kavita's "who hasn't submitted" check**: `GET /api/hr/tracker?period=YYYY-MM`
  does exactly one query for every `managerId`-having `User` in her company,
  and an anti-join against `Feedback` rows for that period. It's a plain read
  off the model, not a bolted-on status field that could drift out of sync.
- **Employees viewing their own trend**: `GET /api/me/feedback` returns every
  `Feedback` the employee has received, ordered by period, each with its 5
  scores — directly groupable by parameter for a trend line.

## Assumptions

1. **The 5 parameters are fixed platform-wide, not per-company.** The brief
   says "5 fixed parameters" without describing per-company customization,
   so `FeedbackParameter` is a single shared table rather than scoped to
   `Company`. Easy to change (add a `companyId` column) if a real pilot
   customer wanted their own set.
2. **One feedback cycle = one calendar month**, encoded as a `"YYYY-MM"`
   string rather than a full date, since the brief describes monthly feedback
   and periods need to be simple to compare and sort.
3. **A manager can edit their submission for the current month** (the API
   upserts on `(employeeId, period)`), so a correction doesn't require a
   second, conflicting row. Past months are editable too in this version —
   a real product would probably lock a period once it's closed; that's not
   modeled here.
4. **"Manager" and "employee" are not stored roles.** Whether someone can
   give feedback is derived from whether anyone reports to them
   (`managerId`), not from a role flag — this is what lets Priya be both at
   once. `isHR` is the only explicit role, and it's a permission flag, not a
   position in the hierarchy (an HR lead can also be someone's report and
   receive their own feedback, as modeled for Bright Path's Leela).
5. **People without a manager modeled in the system are allowed** — Ananya
   (the COO) and Sameer (the founder) both have `managerId = null`. The brief
   mentions Rohan "reports to the COO"; the COO is modeled as a real user in
   Ashoka Textiles with no manager of her own, rather than inventing a level
   above her.
6. **Auth is intentionally minimal**: email + password + JWT, no email
   verification, password reset, or SSO. Every pilot company shares one login
   page and one `users` table (`email` is globally unique); the backend
   resolves which company a user belongs to from the row itself, matching
   "different companies, same app" from the brief.
7. **HR is company-scoped, not a platform-wide admin.** Kavita only ever sees
   Ashoka Textiles; a second company's HR lead (added to Bright Path for
   symmetry, see below) only sees Bright Path.
8. **Added an HR lead at Bright Path Consulting (Leela) that isn't in the
   original brief**, so the multi-tenant HR view could be demoed and tested
   at both pilot companies rather than just one. She's also seeded as one of
   the founder's 8 direct reports, to exercise "HR lead who also receives
   feedback" as a case the model needs to support.
9. **Score scale is 1-5** with a required comment per parameter per
   submission — not stated explicitly in the brief, chosen as a common,
   simple default.
10. **Employee and HR "apps" are two route groups in one React app**, gated
    by `isManager`/`isHR` on the logged-in user, rather than two separately
    deployed frontends. Given one shared login and one shared backend, this
    seemed like the more honest reflection of the product than duplicating a
    shell app twice.

## Running it

Requires Node 18+.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:migrate   # creates SQLite db + applies schema
npm run seed              # seeds both companies (idempotent — resets and re-seeds)
npm run dev                # http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173, proxies /api to the backend
```

### Seeded logins

Every seeded user's password is `password123`.

**Ashoka Textiles** (3-level hierarchy)

![Ashoka Textiles org chart](docs/ashoka-textiles-org-chart.svg)

- `ananya.kapoor@ashokatextiles.com` — COO, top of tree
- `rohan.mehta@ashokatextiles.com` — VP Operations, manages Priya, reports to Ananya
- `kavita.nair@ashokatextiles.com` — HR Lead, reports to Ananya
- `priya.sharma@ashokatextiles.com` — Team Lead, manages 6, reports to Rohan
- `aditi.joshi@ashokatextiles.com` — Design Associate, reports to Priya
- `karan.malhotra@ashokatextiles.com` — Production Associate, reports to Priya
- `neha.reddy@ashokatextiles.com` — QA Associate, reports to Priya
- `suresh.pillai@ashokatextiles.com` — Merchandiser, reports to Priya
- `farah.sheikh@ashokatextiles.com` — Sourcing Associate, reports to Priya
- `vikram.solanki@ashokatextiles.com` — Logistics Associate, reports to Priya

**Bright Path Consulting** (flat, no middle layer)

![Bright Path Consulting org chart](docs/bright-path-org-chart.svg)

- `sameer.verma@brightpathconsulting.com` — Founder, manages 8 directly
- `meera.iyer@brightpathconsulting.com` — Senior Consultant, reports to Sameer
- `arjun.rao@brightpathconsulting.com` — Consultant, reports to Sameer
- `divya.menon@brightpathconsulting.com` — Consultant, reports to Sameer
- `kabir.singh@brightpathconsulting.com` — Consultant, reports to Sameer
- `ritu.bhatia@brightpathconsulting.com` — Associate Consultant, reports to Sameer
- `yash.kulkarni@brightpathconsulting.com` — Associate Consultant, reports to Sameer
- `ishaan.chopra@brightpathconsulting.com` — Analyst, reports to Sameer
- `leela.krishnan@brightpathconsulting.com` — HR Lead, reports to Sameer (also a direct report)

Seed data spans the last 4 calendar months, with some managers deliberately
left mid-cycle for the current month so the HR "missing submissions" view has
something real to show.
