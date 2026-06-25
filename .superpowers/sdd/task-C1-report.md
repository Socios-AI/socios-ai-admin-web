# Task C1 Report: Mark Entry Fee Paid

## Status: COMPLETE

## Commit
Pending (see below).

## Files Changed
- `lib/validation.ts` - Added `markEntryFeePaidSchema` (uuid-only, no reason field)
- `app/_actions/mark-entry-fee-paid.ts` - Created server action: requireSuperAdminAAL2, zod parse, caller-JWT RPC call, revalidatePath
- `components/MarkEntryFeePaidButton.tsx` - Created client button component with useTransition + error display
- `app/partners/[id]/page.tsx` - Imported button, added conditional render in identidade non-edit section
- `tests/components/MarkEntryFeePaidButton.test.tsx` - Created test: mock action, render, fireEvent.click, waitFor assertion

## Test Results
- `npx vitest run tests/components/MarkEntryFeePaidButton.test.tsx`: 1 passed (1 test)
- `npx tsc --noEmit`: 0 errors (no output)
- `npx next lint --file components/MarkEntryFeePaidButton.tsx`: No ESLint warnings or errors

## Corrections Applied
- Plan draft used `auth.accessToken`; corrected to `auth.jwt` per the task correction note (verified: `requireSuperAdminAAL2()` in `lib/auth.ts` returns `{ claims, jwt }`).
- Used `getCallerClient({ callerJwt: auth.jwt })` (not `getSupabaseAdminClient()`) so the RPC's `super_admin` claim check passes.

## Adaptation: PartnerRow missing entry_fee columns
- `PartnerRow` in `lib/data.ts` does not include `role`, `entry_fee_amount`, or `entry_fee_paid_at` (these come from the identity migration on another branch).
- `getPartner` uses `select("*")` so the columns will be present at runtime once the migration is applied.
- To avoid modifying `lib/data.ts` (not in the named commit files), type assertions are used in `page.tsx` to access the three fields: `(partner as { role?: string | null }).role`, etc.
- This is runtime-safe: if the columns are not yet in the DB, they return `undefined`, and the condition evaluates to false (button hidden). No crash.

## Concerns
1. `lib/data.ts` was NOT modified. The three fields from the migration are accessed via type assertions in `page.tsx`. This is intentional per the constraint to commit only named files. When the identity migration (branch A) is applied to prod, these columns will be populated and the button will render correctly.
2. The `admin_mark_entry_fee_paid` RPC does not exist in the DB yet (lives on the identity branch). The action will return `API_ERROR` until that migration is applied. This is expected per the plan's phased approach.
