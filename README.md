# StaySync

StaySync is a hotel communication and operations platform for service requests, incidents, room-status changes, operations logs, work orders, quality scores, and cross-department coordination. It intentionally does not duplicate reservation, occupancy, or revenue functions from a PMS.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add Supabase credentials. Keep `NEXT_PUBLIC_DEMO_MODE=true` to explore the seeded product UI without a live project.
3. Start the app with `npm run dev`.
4. Open `http://localhost:3000` and use a demo login:

   - Front Desk: `alex.morgan` / `staysync-demo`
   - Housekeeping: `priya.shah` / `staysync-demo`
   - Maintenance: `jordan.lee` / `staysync-demo`
   - Manager: `maya.chen` / `staysync-demo`
   - Account Holder: `owner@northstar.demo` / `staysync-demo`

The login currently enters a deterministic demo workspace when demo mode is enabled. The production employee endpoint is implemented at `/api/auth/employee` and resolves usernames server-side, so employees are never asked for an email or property code.

## Supabase

The migration in `supabase/migrations` contains the normalized schema, indexes, reusable tenant/permission helpers, RLS policies, private attachment storage policy, and Realtime publication. Run it through the Supabase CLI:

```bash
supabase start
supabase db reset
```

Application seed data uses stable IDs. Auth-backed users should be created before user-referencing fixtures, either through the Supabase dashboard or an environment-specific admin seed script. Never commit the service-role key.

## Verification

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

GitHub Actions runs type checking, unit/component tests, the production build, and Chromium end-to-end tests. The project deploys directly to Vercel as a Next.js application.

## Architecture

- `src/app`: App Router pages and Route Handlers
- `src/components`: reusable product, dashboard, and shadcn-style UI components
- `src/lib`: permissions, demo fixtures, and Supabase clients
- `supabase`: local configuration, schema/RLS migration, and seed data
- `tests/e2e`: department workflow coverage

The UI is permission-shaped: irrelevant modules are omitted rather than disabled. Database access is independently enforced by organization, property membership, and explicit permission checks through RLS.
