# Implementation and operation

## Stack

React 19, TypeScript, Vinext/Next-compatible routing, existing Shadcn primitives, Cloudflare-compatible Sites Worker. Supabase Postgres, private Storage, Edge Functions and pg_cron provide server persistence. Keep `pnpm-lock.yaml` and use the declared pnpm version.

The demonstration state is a versioned JSONB aggregate per authenticated Site viewer. A workspace row lock serializes writes; normalized allocation rows enforce exclusive inventory through a partial unique index. The commit RPC checks references and payment allocation bounds and writes state, audit, outbox and idempotency together. This deliberate demonstration architecture is not the final normalized, shared multi-user production model.

## Start

1. `pnpm install --frozen-lockfile`
2. Configure `PROJECTOS_INTERNAL_KEY` and `SUPABASE_PROJECT_URL` as server-only runtime values. Never prefix secrets with `NEXT_PUBLIC_` or `VITE_`. For local development use ignored `.env.local`.
3. Apply SQL from `db/projectos_demo.sql`, `db/projectos_demo_jobs.sql`, `db/projectos_demo_storage.sql`, and `db/projectos_demo_inquiries.sql` in that order to an approved demo Supabase project.
4. Deploy `supabase/functions/projectos-gateway/index.ts`; configure its accepted SHA-256 server-key fingerprint to match the server key. JWT platform verification is off only because this function verifies a server-to-server secret before every operation. It is never called directly by a public browser.
5. `pnpm dev`, or `sites-preview start /absolute/checkout` in the managed preview environment.
6. `node tests/acceptance.mjs`, `pnpm exec tsc --noEmit --incremental false`, then `pnpm build`.

## Site deployment

`.openai/hosting.json` identifies the existing private Site. Preserve it and use the Sites source/build/package/publish workflow. Runtime secrets are stored separately from source. Do not publish this demo as a production sales service or broaden its audience without an explicit decision.

## Roles and example walkthrough

Use the **View as** control only within the fictional demo. Manager approves A-204's offer; Sales creates its hold; Legal uploads, reviews and verifies the reservation agreement; Finance verifies CAD 4,000 and CAD 6,000 and allocates both to the deposit. Manager confirms reservation. Legal verifies all sale-agreement signatures and binding conditions. Finance verifies CAD 90,000 and CAD 400,000, allocates the receipts and clears finance; Legal records final evidence. Manager completes the sale. Delivery records inspection/readiness and handover. Buyer reports an issue; Care approves and assigns; Contractor schedules, starts and submits photo evidence; Buyer responds; Care verifies closure.

The original generated architectural illustration remains in Site history; the GitHub working source uses the compressed WebP asset. All people, projects and monetary amounts are fictional.

## Routes

- Marketing: `/`, `/product`, `/how-it-works`, `/solutions`, `/contact`, `/privacy`, `/terms`, `/sign-in`.
- Development: `/developments/:slug`, `/developments/:slug/homes`, `/developments/:slug/homes/:unitId`.
- Workspace: `/app` and `/app/:projectId/:section/:recordId`.
- Server API: `/api/os`, `/api/os/upload`, `/api/os/files/:id`, `/api/contact`.

## Extension boundaries

Payment intake and e-signing providers are not integrated. No webhook adapter is active. Financial movements are separate from the software subscription. No tax/legal rule, binding contract effect, or registry filing is inferred by software.
