# StaySync

StaySync is a secure, multi-property hotel operations workspace. It gives a General Manager one operational view across departments while keeping each employee focused on work that belongs to their property and department.

It complements a property-management system rather than replacing it: StaySync coordinates service requests, incidents, room updates, maintenance, handovers, notifications, reports, and quality awareness without storing reservations or guest billing.

## Product capabilities

- General Manager account with property-wide visibility, employee access management, password resets, property administration, report building, and supervisor calls
- Username-and-password employee sign-in; employee email addresses are optional
- Department-aware operations logs, service requests, incidents, room-status updates, work orders, and preventive maintenance
- Housekeeping room assignment and attendant-specific work views
- Current department quality scores with previous-score up/down movement, without a historical score feed
- In-app notifications that expire 24 hours after being opened
- CSV and Excel-compatible operational report exports
- Organization, property, department, role, and permission scoping backed by Supabase Row Level Security

## Technology

- Next.js 15 App Router, React 19, and TypeScript
- Tailwind CSS and Radix UI primitives
- Supabase Auth, PostgreSQL, Row Level Security, and Storage
- Vitest, Testing Library, and Playwright
- Vercel-ready deployment configuration

## Local setup

Requirements: Node.js 20 or newer, npm, and a Supabase project (or the Supabase CLI for a local stack).

```bash
npm install
copy .env.example .env.local
npm run dev
```

Configure these values in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is supported only as a compatibility fallback. The service-role key is server-only: never prefix it with `NEXT_PUBLIC_`, expose it to browser code, or commit it.

Apply every SQL file in `supabase/migrations` in filename order. With the Supabase CLI:

```bash
supabase start
supabase db reset
```

The seed file intentionally contains no organization, property, employee, credential, or operational records. Register the first account in the application and complete onboarding to create the organization, initial property, departments, and General Manager profile.

## Available commands

```bash
npm run dev          # local development server
npm run typecheck    # TypeScript validation
npm test             # unit and component tests
npm run test:e2e     # Playwright workflows
npm run build        # production build
npm start            # serve the production build
```

## Deployment on Vercel

1. Import the repository into Vercel as a Next.js project.
2. Add the three required Supabase environment variables for Production and Preview.
3. Apply the database migrations to the production Supabase project.
4. Add the Vercel production URL to Supabase Auth URL configuration and allowed redirect URLs.
5. Deploy and create the first organization through onboarding.

Vercel runs `npm run build` from `vercel.json`. Do not add real credentials, user records, or production data to this repository.

## Architecture

```text
src/app/                 App Router pages and authenticated route handlers
src/components/          Dashboards, operational modules, dialogs, and UI
src/lib/auth/            Authenticated viewer and access context
src/lib/supabase/        Browser, server, and admin Supabase clients
src/lib/*-store.ts       Client adapters for authenticated operational APIs
supabase/migrations/     Schema, RLS, security, and application configuration
tests/e2e/               Browser workflow coverage
```

Browser components never receive the Supabase service-role key. Operational route handlers resolve the signed-in viewer on the server, constrain records to the viewer’s organization and authorized properties, and apply application permissions in addition to database policies.

## Data and account model

- The initial account is the account-holder/General Manager and can update its own name, username, email, and password.
- Staff accounts require a unique username and password; email is optional.
- A General Manager can create, retitle, deactivate, delete, or reset a staff account without knowing its old password.
- Employee-created names and usernames remain persisted because account changes are stored in Supabase Auth metadata and the application profile.
- Department records are database-backed. Renaming a department affects future labels while existing log text remains an immutable snapshot.

## Security notes

- Authentication is required for every workspace route and operational API.
- Tenant access is scoped by organization and property membership.
- Database RLS is the final authorization boundary; server-side service-role operations must also enforce viewer scope explicitly.
- Passwords are managed by Supabase Auth and are never returned to managers after creation.
- Secrets belong in local or Vercel environment variables, not committed files.

## Contributing

Keep changes tenant-safe, avoid fixture data in runtime modules, add migrations for schema changes, and run the verification commands before opening a pull request. Comments should explain security boundaries or non-obvious business rules—not restate straightforward code.
