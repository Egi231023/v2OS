# ProjectOS — implementation notes

## Authorized target
- GitHub: Egi231023/v2OS. Empty main branch verified 2026-09-24. This is the requested source repository.
- Supabase: Os realestate (hpnwxjfyfsoauxqhpjtb), ca-central-1. Existing companies/memberships/projects/units/publications tables contain no rows; preserve them.
- Product: simple, functional residential sales, delivery and care system for developers, agencies, buyers and contractors.
- Design: warm light workspace, graphite text and deep green actions; calm, readable, restrained luxury. English UI, translation strings separated; CAD fictional Canadian demo.
- Execute sequentially and autonomously; verify each phase and provide concise updates. No optional production services or billing activation.

## Source completeness
The supplied attachment contains chapters 1–19 and only the beginning of chapter 20. It literally ends with `... (19 KB left)`. Chapter 21 and the remaining acceptance criteria were NOT supplied. Do not claim to have read or implemented missing content. Preserve the received brief in docs/source-brief.md.

## Architecture decisions
- One modular Vinext/React application, server route handlers and Supabase Postgres/Storage/Edge Functions. Sites provides private hosting; GitHub v2OS retains source.
- Isolate new data under a projectos schema; do not repurpose existing unidentified tables.
- Authoritative relational records for organization/project/inventory/deal/allocation/payment and explicit workflow records for supporting modules.
- Transactions, locks, unique active allocations, immutable money records, idempotency and optimistic versions enforced on the server/database.
- Prototype/demo is explicit and uses fictional data. Production remains disabled until responsible organization, approved local policies/templates/bank account and verification are supplied.
- Private authenticated preview uses platform identity. Production external Supabase Auth integration must be verified before enabling real users; demo identities never become production memberships.
- No paid provider required for the manual signing and bank-verification workflows; no email or SMS delivery is claimed.

## Build sequence
1. Record requirements and preserve source; inspect existing repository/database.
2. Theme, seven-item internal navigation, developer dashboard, project/inventory, deal, buyer home and contractor job screens.
3. Database scopes, grants, server access layer and isolated demo sessions.
4. CRM, offers, hold/reservation, signature evidence, payments and cancellation.
5. Delivery checks/handovers, changes/milestones and full care workflow.
6. Public project pages/forms, tasks/calendar/messages, reports/export/audit.
7. Concurrency, isolation, workflows, UI/mobile tests; publish private demo; record actual limitations.

## Non-negotiable invariants
- Project has one owning organization; billing never grants data access. Grants checked per operation and record; previous buyers and reassigned contractors cannot see current private data.
- One active allocation per inventory item. Home + accessories acquire together in stable lock order. Stale requests/versions cannot overwrite newer facts.
- Request != hold != reservation; fully signed != binding != completed != handed over.
- Expiry rechecks signing/payment risk and never releases a reserved/committed/completed allocation.
- Money uses integer minor units. Evidence != confirmed receipt. Allocations cannot overpay a schedule item or overspend a transaction. Corrections use linked movements.
- Refund and bank-account production approvals require another authorized person. Admin does not bypass legal/finance/delivery gates.
- Contractor submits work; customer care verifies closure with owner response or documented follow-up. Declining a job does not decline the claim.
- Audit and outbox are atomic with state changes; retries are idempotent. Files are private and audience checked again on download.
- Public availability uses live server data, not published website snapshots. Exports have the same scope as screens.

## Verification to record
- Two conflicting reservations: only one succeeds; all-or-nothing accessory allocation.
- Expiry vs reservation/payment/signing; duplicate keys and mismatched payloads.
- Tenant isolation, agent/buyer/contractor scope, revocation, internal-message secrecy.
- Partial receipts/refunds/reversal; signature/completion/handover gates.
- End-to-end repair including decline, reassignment, evidence, review, reopen.
- Persistence across reload, public forms, filters, deep links, empty/error states, narrow viewport and keyboard.
- Actual backup/restore and production operational checks are release gates; do not fabricate results.

## Current status
Discovery complete. Implementation in progress. No production readiness assertion.
