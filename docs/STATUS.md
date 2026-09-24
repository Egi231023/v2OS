# ProjectOS — implementation checkpoint

Updated 2026-09-24.

## Confirmed services
- Requested source: Egi231023/v2OS. Initial documentation committed as 74e3963f386c778495f31f26eee38bd1d28087b1.
- Requested database: Os realestate, project hpnwxjfyfsoauxqhpjtb.
- Existing public tables: companies, company_memberships, projects, units, project_publications. All had zero rows and RLS enabled when checked. No changes to those tables were applied.
- New private Site registered, not deployed: appgprj_6ab59ef8f3c48191843d84475670c4a4. Reuse this ID; do not create another Site. Its expected URL is not a verified live URL.

## Local work completed before interruption
Checkout: /workspace/sites/projectos-v2
- Standard Vinext starter initialized; managed Linux profile configured.
- Dependencies installed successfully using pnpm; retain the lockfile.
- Warm ivory / graphite / deep green theme authored in app/globals.css.
- Public homepage, layout metadata and favicon authored.
- lib/projectos/types.ts and seed.ts authored with fictional organizations, projects, inventory, role personas, a CAD 500,000 offer including accessories and a sample repair.
- Original brief copied to docs/source-brief.md.
- Original generated development image at public/images/cedar-quay.png. Source copy: /workspace/scratch/projectos-assets/cedar-quay-waterfront.png.
- These application source files have NOT yet been pushed to GitHub, compiled, tested or deployed. Check whether the local checkout survives before reconstructing anything.

## Interruption
The execution environment disconnected. Two consecutive shell calls failed with `409 Conflict, environment_offline: Environment is not connected`. The large write intended for permissions.ts and engine.ts failed before process creation; do not assume those files exist. GitHub connector remained available, allowing this checkpoint.

## Next work
1. Restore access to the existing checkout and inspect its state.
2. Finish the server authorization/domain implementation and connect authenticated requests to Supabase.
3. Build the developer workspace and role-specific portals.
4. Implement and verify transactional workflows, private files, persisted tasks/outbox and audit.
5. Verify mobile/desktop UI and access isolation, then push source to v2OS and publish the private Site.

## Source gap
The attachment literally ends in chapter 20 with `... (19 KB left)`. The remainder and chapter 21 were not received. Obtain the complete source before claiming the acceptance criteria are covered.

## Honest status
No application is deployed. No Supabase schema migrations have been applied. No functional, security, concurrency or recovery tests have passed yet. The committed deliverables are implementation notes and this checkpoint only.
