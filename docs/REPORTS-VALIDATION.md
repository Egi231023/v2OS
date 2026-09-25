# Reports and task management — 25 September 2026

PASS: `node tests/reports.mjs` verifies denied buyer reports and foreign projects, permitted project scope, invalid dates and inclusive UTC end dates, 4,000 + 6,000 receipts minus 2,000 refund, separate EUR totals, warnings for unknown receipt dates, CSV formula escaping and allowlisted fields, task reassignment authorization, unchanged original state/history and stale-write rejection.

PASS: `node tests/acceptance.mjs`, `node tests/setup.mjs`, `npx tsc --noEmit`.

NOT RUN: authenticated browser/mobile report downloads and task assignment through the deployed UI. Browser security rejection from the preceding session remains a blocker; no workaround attempted. These results do not establish A36 or production readiness.

The existing fictional Sam receipt has no received date in older workspaces. Its amount is deliberately excluded from period totals with a visible incomplete-data warning; no received date was invented. Dates filter receipt movements and lead creation cohorts only. Other reports represent current state. Report CSV exports all permitted matching rows, not only the current page, and uses integer minor units. Task assignment changes neither object grants nor domain completion gates. Shared-account revocation does not yet automatically redistribute all tasks.
