# Acceptance evidence

Version: ProjectOS demo source delivered 24 September 2026. This matrix distinguishes code tests from integrated acceptance; a reducer test is not a database race or browser test.

| ID | Status | Evidence / remaining requirement |
|---|---|---|
| A01 | Not run (full scenario) | Code test denies cross-organization inventory read/write; API/export/file penetration checks remain. |
| A02 | Not run | Billing change workflow not implemented. |
| A03 | Not run | Revocation denial and task reassignment implemented; agency replacement integration not tested. |
| A04 | Pass (API/database) | Two simultaneous Edge API commits from one revision produced exactly one success and one 409. Exactly one deal held all three items. |
| A05 | Pass (code) | Failed conflicting item set leaves no partial allocation. |
| A06 | Pass (API/database) | Live Edge API and SQL tests returned the same result on replay and rejected the same key with changed content. Browser lost-response simulation pending. |
| A07 | Not run | Persisted cron expiry exists; measured external availability/expiry test pending. |
| A08 | Not run | Workspace serialization designed; concurrent transaction sequence not measured. |
| A09 | Not run | Worker checks open signing; integrated execution pending. |
| A10 | Not run | Late receipt creates review task; integrated scenario pending. |
| A11 | Not run | Offer snapshot and expiry cap implemented; full price/publish scenario pending. |
| A12 | Pass (code) | Buyer evidence creates pending receipt, not confirmed payment. |
| A13 | Pass (code) | CAD 4,000 + 6,000 leaves exact zero deposit balance. |
| A14 | Not run (concurrent scenario) | Engine and database bounds implemented; concurrent allocation proof pending. |
| A15 | Not run (full scenario) | Refund/reversal records preserve history; full overpayment/correction coverage pending. |
| A16 | Pass (code) | CAD 2,000 refund after completion produces debt without reversing completion/keys. |
| A17 | Pass (code) | Fully signed agreement alone does not complete sale. |
| A18 | Not run | No external signing event adapter; version exception coverage pending. |
| A19 | Not run | Financial mutations invalidate pre-completion checks; full material version coverage pending. |
| A20 | Pass (code) | Missing sale/readiness/payment gates reject key issuance. |
| A21 | Not run | Refused branch implemented; explicit test pending. |
| A22 | Not run | Termination review and Withdrawn release implemented; full evidence workflow pending. |
| A23 | Not run | Accepted-version change action guarded; retry integration pending. |
| A24 | Not run | Duplicate contact creates manager task; privacy/provenance review pending. |
| A25 | Not run | Pre-handover/shared-area cases supported; explicit tests pending. |
| A26 | Not run | Reassignment/decline scope handling implemented; stale-session proof pending. |
| A27 | Pass (code) | Contractor submission stays Awaiting verification; Care closes after owner confirmation. |
| A28 | Not run | Dispute/reopen branches implemented; explicit tests pending. |
| A29 | Not run | Audience filters exist; full channel/export/download verification pending. |
| A30 | Pass (rollback), crash pending | Live Supabase transaction test verified a rejected allocation creates no extra audit/outbox event. Worker crash/restart test pending. |
| A31 | Not applicable | No external webhook adapter is configured in this demo. |
| A32 | Blocked | Isolated backup/restore environment and rehearsal are not prepared. |
| A33 | Not run | UI preserves an idempotency key for identical retries; network-loss integration pending. |
| A34 | Blocked | Selective verified property-access transfer not implemented. |
| A35 | Pass (code) | Refund proposer cannot self-approve; second Finance persona required. |
| A36 | Blocked | Code journey passes through verified repair; desktop/mobile browser validation blocked by environment policy. |

Executed: `node tests/acceptance.mjs` and TypeScript check. The test source is the reproducible evidence for code-level Pass rows. No production readiness, legal compliance, availability SLA, restore time or capacity is claimed.

Executed `node --env-file=.env.local tests/integration.mjs` against the actual Edge API on 24 September 2026. Final result: PASS. The first concurrency attempts timed out; after replacing the stale-revision SQLSTATE with explicit PT409, the complete concurrent request/replay test passed. This is not a latency guarantee. Temporary QA authorization was removed after testing. Fictional QA workspaces remain isolated from customer data.

Live database RPC checks also passed on 24 September 2026: idempotent replay, changed-payload rejection, exclusive-allocation uniqueness and atomic rollback of audit/outbox. Test writes were rolled back. Security advisor reported INFO-only RLS-without-policy notices on intentionally private server-only tables; no public policies were added to suppress those notices. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
