# AGENTS.md

## Project Context

- This is a Next.js App Router MVP for the T-Credit contribution workflow.
- The app can run without PostgreSQL. If `DATABASE_URL` is not set, it falls back to the in-memory/mock repository.
- Prisma/PostgreSQL mode is enabled when `DATABASE_URL` is present.
- Main scripts:
  - `npm run dev`
  - `npm run build`
  - `npm run test`
  - `npm run db:generate`
  - `npm run db:push`
  - `npm run db:seed`

## Project Map

Use these paths first when a user asks to change a screen or behavior. Avoid broad file searching until these likely locations have been checked.

- Home/dashboard screen: `src/app/page.tsx`
- App frame and navigation shell: `src/components/AppShell.tsx`
- Global styles: `src/app/globals.css`
- New contribution page: `src/app/contributions/new/page.tsx`
- My contributions page: `src/app/contributions/mine/page.tsx`
- My contributions server actions: `src/app/contributions/mine/actions.ts`
- Contribution form UI: `src/components/ContributionForm.tsx`
- Contribution table/list UI: `src/components/ContributionTable.tsx`
- Contribution server actions: `src/app/contributions/actions.ts`
- Approval page: `src/app/approvals/page.tsx`
- Approval server actions: `src/app/approvals/actions.ts`
- Approval workbench UI: `src/components/ApprovalWorkbench.tsx`
- Approval history table UI: `src/components/ApprovalHistoryTable.tsx`
- Approver insights page: `src/app/approver-insights/page.tsx`
- Committee page: `src/app/committee/page.tsx`
- Admin page: `src/app/admin/page.tsx`
- Account actions: `src/app/account/actions.ts`
- Shared UI components: `src/components/`
- Domain types and scoring/status logic: `src/lib/domain.ts`
- Domain tests: `src/lib/domain.test.ts`
- Static labels and lookup values: `src/lib/lookups.ts`
- Repository/data access layer: `src/lib/server/tcredit-repository.ts`
- Prisma client setup: `src/lib/prisma.ts`
- Prisma schema: `prisma/schema.prisma`
- Seed data: `prisma/seed.js`
- Security helpers: `src/lib/security.ts`
- Security tests: `src/lib/security.test.ts`
- Mock identity provider: `src/lib/providers/identity.ts`
- Documentation: `docs/`
- KMU logo asset: `public/logos/kmu-bisa-symbol.jpg`

## Search Guidance

- For "change this page/screen" requests, start from the matching `src/app/**/page.tsx` file.
- For form, table, badge, popover, and layout changes, check `src/components/` before searching the whole repo.
- For scoring, statuses, permissions, and business rules, start in `src/lib/domain.ts`, `src/lib/security.ts`, or `src/lib/server/tcredit-repository.ts`.
- For database shape or seed-data changes, start in `prisma/schema.prisma` and `prisma/seed.js`.
- `rg` is not installed in this project environment. Always use PowerShell search commands.
- Use PowerShell `Get-ChildItem` with `Select-String` over limited paths rather than repeatedly scanning from the repository root:

  ```powershell
  Get-ChildItem src/app,src/components,src/lib -Recurse -File | Select-String -Pattern "term"
  ```

## Build Notes

- `npm run build` runs `prebuild` first.
- `prebuild` is `prisma generate`.
- Therefore, a failure in Prisma Client generation stops `npm run build` before the Next.js build step starts.

## Known Windows Prisma Issue

On Windows, `prisma generate` may fail with an `EPERM` rename/unlink error involving a Prisma engine DLL, usually under paths like:

- `node_modules\.prisma\client\query_engine-windows.dll.node`
- `node_modules\@prisma\engines\query_engine-windows.dll.node`

This is usually a local file lock, not an application code error. Common causes:

- a running Next.js dev server
- a running Node.js process
- a test watcher
- an editor or terminal extension holding the Prisma DLL
- antivirus or Windows Defender scanning `node_modules`

When this happens, do not keep retrying `npm run build` in a loop. The same Prisma generate step will usually fail repeatedly until the lock is released.

## Recovery Steps For EPERM During Prisma Generate

Use this order before investigating unrelated source paths:

1. Stop all running dev servers, test watchers, and Node.js processes for this project.
2. Close terminals or editor tasks that may be using the app.
3. Run:

   ```powershell
   npm run db:generate
   ```

4. If the same `EPERM` DLL rename error remains, restart the terminal or editor.
5. If still locked, reboot Windows.
6. After `npm run db:generate` succeeds, run:

   ```powershell
   npm run build
   ```

## Avoid Wasting Time

- If the build log shows Prisma `EPERM` during DLL rename/unlink, focus on releasing the Windows file lock first.
- Do not spend time searching the source tree for missing route files or TypeScript issues until Prisma generation has succeeded.
- Do not delete or regenerate unrelated app files to fix this error.
- Treat this as an environment/runtime lock issue unless the error changes after `npm run db:generate` succeeds.

## Useful Commands

```powershell
npm run db:generate
npm run build
npm run test
```

To check for running Node processes on Windows:

```powershell
Get-Process node -ErrorAction SilentlyContinue
```

Only stop processes you recognize as safe to stop.
