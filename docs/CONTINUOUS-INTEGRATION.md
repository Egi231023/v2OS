# GitHub verification

`.github/workflows/verify.yml` runs on pushes to main, pull requests and manual dispatch. It installs the committed dependency lockfile with the project's pinned pnpm version, checks TypeScript, runs all three offline domain test suites and builds the application.

Each test suite is a separate failing step. No `continue-on-error`, production credentials, external customer messaging, schema mutations or deployment is enabled. Job permissions are read-only. Concurrent obsolete runs are cancelled and the job has a 20-minute timeout.

These are automated regression checks, not proof of full production readiness. The workflow does not run authenticated browser/mobile tests, live database concurrency tests, restore rehearsals or legal/process approvals. Lint is not included in this initial gate; existing lint debt must be assessed separately without disabling rules merely to obtain a green status.

Results: https://github.com/Egi231023/v2OS/actions

Branch protection is not changed: a failing check is visible, but merges are not automatically blocked unless required checks are configured by the repository owner.
