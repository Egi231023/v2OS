# ProjectOS status

Updated 25 September 2026. The complete master prompt v2, chapters 1–23 and A01–A36, was received in chat. Changes lost in the interrupted local environment were reconstructed from the saved source and conversation, then tested.

## Delivered implementation

- Private fictional demonstration hosted at https://projectos-v2.egi2310.chatgpt.site.
- Requested Supabase project: Os realestate (`hpnwxjfyfsoauxqhpjtb`). Additive private `projectos_demo` schema; existing public application tables are not replaced.
- Developer overview, inventory/project detail, deal detail, buyer view and contractor work orders.
- ProjectOS marketing pages and a fictional development catalogue with filtering and distinct interest/viewing/reservation requests.
- Server-checked demo personas, scoped data projection, private document upload/download, optimistic concurrency, idempotency, audit and transactional outbox.
- Exclusive home/accessory holds, scheduled expiry/review, verified external signatures, separate binding approval, exact receipt allocations, completion/readiness/handover checks and repair verification.
- External refund execution records with two-person approval, preserved original payment/allocation history, commissions and viewing collision checks.
- New projects with currency/timezone/area settings; mapped CSV inventory preview and atomic import; external-ID updates; new lead-to-deal offers with home/accessories and buyer participants; frozen policy parameters and exact currency-aware instalments.
- Project-scoped grant creation/revocation, payer/owner separation, two-person bank approval, client-change fulfilment, milestone creation and service pause/resume.
- Shared sandbox workspaces at `/team`, using authenticated ChatGPT/Sites identities. One-use invitation codes create pending requests; owners approve explicit role assignments. Revoked members fail subsequent reads/writes, and a shared account cannot switch to an unassigned persona. Site sharing remains private and must independently allow participants.

## Important scope boundaries

This is **not a completed production V1**. Personal demos allow fictional persona switching. Shared sandboxes persist common data and restrict each authenticated account to assigned personas. Authentication/recovery belongs to ChatGPT/Sites; app-owned Supabase email/password authentication and production MFA enforcement are not implemented. Shared access has database-level tests, but multi-browser end-to-end verification remains pending. Do not import real customer data.

Remaining required implementation includes: production identity/MFA and complete organization lifecycle; full document/checklist WorkflowPolicy configuration and price-policy rules beyond the implemented parameter versions; production-grade upload scanning and evidence provenance; comprehensive buyer/property access transfer; report definitions/filter drill-down parity; durable reminder coverage and operator retry UI; backup/restore rehearsal and monitoring ownership. A full agency replacement and task reassignment after shared-account revocation still need integrated coverage.

Not every acceptance scenario is passed. See ACCEPTANCE.md for the evidence and limitations. Browser QA is blocked by a browser security-policy rejection in this environment; no workaround was attempted. A successful build or code-level test does not verify deployed UI interactions or mobile rendering.

## Production activation inputs

Owner/project team must supply the actual market, organizations, roles, approved documents and process policy, inventory/prices, verified bank instructions, retention policy, and accountable legal/finance/delivery/care staff. These inputs alone do not remove the implementation gaps above.

## Data and integrations

No money is transferred. No external signatures are executed. No real customer email/SMS is sent. Those events are recorded through explicit manual verification. The marketing contact form writes a separate operator inquiry area, not developer CRM.
