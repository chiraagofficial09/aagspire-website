# Performance Audit — Aagspire Work

Date: 2026-10-28

## Scope and method

**Actual stack** (from `package.json` files): Vite 6 + React 18 SPA, React Router 7, axios with a custom in-memory GET cache (`src/services/api.ts`), Tailwind, recharts. Backend: Express 4 + Mongoose 8 on MongoDB. There is **no Next.js, SSR, RTK Query or React Query data layer** in use (`@tanstack/react-query` is installed but no queries use it), so those parts of the audit brief do not apply.

**How measurements were taken**

- **No production access.** I had no production URL, logs or database. All numbers below come from local runs.
- **Local data is tiny** (4 employees, 3 projects, 2 attendance rows), so raw local database time is not representative of production.
- **Simulated network latency.** To reproduce what production pays for, a TCP latency proxy sat between the API and MongoDB, adding 20 ms each way (≈40 ms per round trip, typical of a cloud-hosted Atlas setup). Each endpoint was called 1× to warm up, then 5×, and the median is reported. Every request used real JWT auth through the real Express app, with no logging (`NODE_ENV=production`).
- **Scaling tests.** For data volumes larger than the local set, a separate throwaway database (`aagspire_perf_verify`) was seeded and dropped afterwards. The real `aagspire_work` database was only read, apart from the auth middleware's normal last-activity write.
- **Bundle sizes** come from `vite build` output (raw and gzip).
- **Harness location.** The scripts are in `server/scratch/` (gitignored): `perf.mts`, `earnings-equivalence.mts`, `earnings-bench.mts`.

What was already in good shape before this audit:
- route-level code splitting and portal chunk prefetching
- optimistic auth (`/auth/me` verified in the background)
- GET cache with in-flight de-duplication
- response compression and CORS preflight caching (`maxAge`)
- parallelised admin dashboard queries
- indexes on all hot filter fields

The remaining problems were concentrated in a few places.

## A. Root causes (confirmed)

### 1. N+1 queries in employee earnings — **Critical**
- **File:** `server/src/services/earnings.service.ts`, `calculateEmployeeEarnings` (batch now at lines 200–211).
- **Problem:** for every project assigned to an employee, the loop ran 3 sequential queries (`ProjectCommission.findOne`, `ClientPayment.find`, `SettlementItem.find`), plus one `Settlement.findById` per settlement item. With about 40 ms per database round trip, that's roughly 120 ms per project, all in series.
- **Evidence** (≈40 ms simulated round trip, 1 paid settlement item per project):

  | Projects per employee | Before | After |
  |---|---|---|
  | 10 | 2,817 ms | 311 ms |
  | 30 | 7,852 ms | 331 ms |

- **User impact:** this function backs the employee dashboard, employee projects, earnings, profile, settlement preview/create, and admin "employee earnings". These pages get slower the more projects an employee has, which matches the "takes too much time to load" report.
- **Fix:**
  - All commissions, payments and settlement items for the employee's projects now load in **one batched query each**, run in parallel.
  - Referenced settlements load in **one** follow-up query.
  - The totals query joins the same parallel batch, and the allocations query now runs in parallel with the directly-assigned-projects query (line 104).
  - The calculation logic is unchanged.
- **Correctness check:** the old and new implementations were run on seeded data covering:
  - paid, draft and cross-month settlements
  - user-ID aliases
  - orphaned and stale allocations
  - auto-created shares
  - discounts and production costs
  - 7 month filters

  All **28 employee/month combinations produced identical output** (`server/scratch/earnings-equivalence.mts`).

### 2. Serial query chain in the employee dashboard — **High**
- **File:** `server/src/controllers/analytics.controller.ts`, `getEmployeeDashboard` (lines 114, 233).
- **Problem:** the work logs, today's attendance, recent logs and receipts don't depend on the earnings or project queries, but they waited for both to finish. The same work-log query also ran twice: once for "approved" logs and once for all logs.
- **Fix:**
  - These reads now start immediately and overlap the earnings chain.
  - Approved logs are filtered in memory from the full list, which gives the same result.
  - The `ProjectEmployee` read deliberately still runs after earnings, because earnings can auto-create those records.
- **Evidence:** `/employee/dashboard` went from **520 ms to 335 ms** with only 2 projects. The gain grows with project count; see finding 1.

### 3. Auth middleware made two database calls in series for employees, and a database write on every request — **High** (affects every API call)
- **File:** `server/src/middleware/auth.middleware.ts` (lines 13, 43).
- **Problem:** for employee requests, `User.findById` had to finish before `Employee.findOne` started, adding one extra round trip to **every** employee request. A `LoginSession` "last activity" write also ran on every request, including 20-second notification polls. Nothing reads `lastActivityAt`.
- **Fix:**
  - When the token says "employee", the Employee lookup runs in parallel with the User lookup.
  - Authorization still uses the stored user's role and status. If the token's role is stale, the code falls back to the serial lookup.
  - The last-activity write is limited to once per minute per user.
- **Evidence:** every employee endpoint is about **60 ms faster** at 40 ms round trip (for example `/employee/profile` 145 → 84 ms, `/employee/terms` 207 → 148 ms). Every request, admin included, makes one fewer write.

### 4. Employee projects list started earnings late — **Medium**
- **File:** `server/src/controllers/project.controller.ts`, `listProjects` (line 82).
- **Problem:** for employees, `calculateEmployeeEarnings`, the deepest query chain, started only after two other stages finished, though it needs neither of them.
- **Fix:** it now starts alongside the project query. The allocation read joins the payments/commissions batch.

### 5. recharts in the admin dashboard's first load — **Medium**
- **File:** `src/pages/admin/Dashboard.tsx` (line 35), new `src/pages/admin/DashboardCharts.tsx`.
- **Problem:** about 400 KB of chart code loaded with the admin landing page. The charts only appear after "Show All Data" is turned on, which is off by default.
- **Fix:** the three chart bodies moved verbatim into a lazily loaded module. Each has a same-size placeholder while loading, so there's no layout shift and no visual change.
- **Evidence:** Dashboard chunk **440.0 KB → 32.2 KB raw (124.4 → 7.3 KB gzip)**. Charts load on demand (409 KB raw / 118 KB gzip).

### 6. Attendance calendar skipped the API cache, and admin requests waited on each other — **Medium**
- **File:** `src/components/work/AttendanceCalendar.tsx` (lines 126, 136).
- **Problem:**
  - Every calendar request sent `Cache-Control: no-cache`, which skips the shared 25-second cache and duplicate-request sharing. On a cross-origin API it can also trigger CORS preflights.
  - The admin calendar fetched holidays, waited for the employee list, then fetched attendance and holidays again.
- **Fix:**
  - Mount, month changes and employee switches now use the cache. Clock-in/out and holiday saves already clear it, because they are POSTs.
  - Explicit Refresh, Retry and returning to the tab still force fresh data.
  - The admin calendar waits for the employee list, then makes one parallel fetch.
- Also changed `listAttendance` to use `.lean()` (`server/src/controllers/attendance.controller.ts:340`). The response is the same, because the models have no virtual fields.

### 7. Shared API cache could serve stale data — **Medium** (correctness)
- **File:** `src/services/api.ts`.
- **Problems** (each reproduced with `server/scratch/api-cache-repro.mts`, which runs the real `api.ts` against a local server):
  1. A GET that started before a save (POST/PUT/DELETE) and finished after it stored pre-save data in the cache, so reads for the next 25 s were stale.
  2. A GET issued right after a save could join that older in-flight request and get pre-save data.
  3. Notifications are polled every 20 s, but the cache kept them for 25 s, so every other poll was served from cache. New notifications appeared only every ~40 s.
- **Fixes:**
  - Every cache invalidation now also drops matching in-flight requests and increments a counter. A request that was already in flight when the counter changed is not stored in the cache.
  - Notifications use a 5-second cache lifetime, which still merges the duplicate focus and tab-visibility calls.
  - Expired cache entries are now removed instead of piling up in memory.
- **Evidence:** before, 3 of 5 checks failed; after, 5/5 pass. Duplicate-request sharing and normal cache hits still work.

## B. Before vs after

| Area | Before | After | Change |
|---|---|---|---|
| Employee earnings, 30 projects (40 ms round trip) | 7,852 ms | 331 ms | −96% |
| Employee earnings, 10 projects (40 ms round trip) | 2,817 ms | 311 ms | −89% |
| `/employee/dashboard` (local data, 40 ms round trip) | 520 ms | 335 ms | −36% |
| `/employee/dashboard` (no added latency) | 254 ms | 141 ms | −44% |
| Typical employee API call (40 ms round trip) | ~207 ms | ~145 ms | −30% |
| Typical admin API call (40 ms round trip) | ~145 ms | ~145 ms | no change (already one auth query) |
| `/admin/dashboard` (40 ms round trip) | 271 ms | 284 ms | within noise; already parallel |
| Admin Dashboard JS chunk | 124.4 KB gzip | 7.3 KB gzip | −94% |
| DB writes per API request | 1 | ≤1 per user per minute | — |
| Initial page load / refresh (LCP, FCP, TTFB) | Not measured | Not measured | No production access; local Lighthouse is not representative of the deployed host and CDN |
| Real production API and DB latency | Not measured | Not measured | No production access |

Full per-endpoint tables are in `server/scratch/perf-{before,after}-d{0,20}.json`.

## C. Files modified

| File | Purpose |
|---|---|
| `server/src/services/earnings.service.ts` | Removed the N+1 queries: batched commission, payment and settlement lookups; parallel allocation and project reads |
| `server/src/controllers/analytics.controller.ts` | Employee dashboard: independent reads overlap earnings; duplicate work-log query removed |
| `server/src/controllers/project.controller.ts` | Employee project list: earnings start early; allocation read batched |
| `server/src/middleware/auth.middleware.ts` | Parallel User and Employee lookup; last-activity write limited to once a minute per user |
| `server/src/controllers/attendance.controller.ts` | `.lean()` on attendance list (part of the earlier calendar fix) |
| `src/pages/admin/Dashboard.tsx` | Lazily loads charts via `Suspense` |
| `src/pages/admin/DashboardCharts.tsx` (new) | Chart bodies moved verbatim from Dashboard |
| `src/services/api.ts` | Cache can't store data from requests that were in flight during a save; in-flight requests cleared on save; 5 s notifications cache; expired entries removed |
| `src/components/work/AttendanceCalendar.tsx` | Cache-aware fetching; fresh data on Refresh, Retry and tab focus; no admin request chain |
| `qa/attendanceCalendarUi.test.mjs` | Updated 3 expectations to the requested behaviour (past working days without a record show **Absent**) |

The locked invoice and receipt files listed in `AGENTS.md` were not touched.

## Verification

- Client `tsc` and server `tsc`: pass. ESLint on new and changed calendar/chart files: 0 errors. The one warning is an intentional hook dependency.
- Earnings old-vs-new equivalence: 28/28 identical.
- Server unit tests: holiday 6/6, projectContractValue and clientProjectSheet 14/15. The one failure, in `clientProjectSheet.test.ts` ("groups by relationship…", 80000 ≠ 74000), is in Google Sheets export code that this audit didn't touch. It was already failing.
- Browser tests (Chrome, mocked API): attendance calendar UI **13/13**, attendance edge cases **8/8**.
- Not run: `test:invoice` (invoice code untouched) and `qa/clientFinance*` suites (require live finance fixtures).

## D. Remaining issues and recommendations

1. **Measure production.**
   - Check the browser DevTools Network tab for `/employee/dashboard` and `/employee/projects` before and after deploying.
   - If the API runs on a free tier (Render, Railway, etc.), the first request after idle can take 30–60 s while the server wakes up. That's hosting, not code. Use an always-on instance or a keep-alive ping.
   - Keep the API and MongoDB Atlas in the **same region**. Every remaining serial query costs one round trip.
2. **Admin dashboard reads whole collections.** `loadFinanceSnapshot` loads every project, payment, commission, share and paid settlement on every dashboard load and month switch. It's one parallel round trip, so fine at current volumes, but payload and CPU grow linearly. When data grows, move these totals into MongoDB aggregations or a short-lived server-side cache invalidated on writes. It also queries `ClientPayment` twice (sorted and unsorted); merging these needs a check that sum order doesn't change rounding.
3. **Writes inside a read.** `calculateEmployeeEarnings` deletes stale allocations and auto-creates missing ones during GET requests. That's a correctness design issue as well as a performance one: those writes would be better in the assign/unassign handlers.
4. **Zero-project employees.** `/employee/projects` now starts the earnings calculation even when the employee has no projects, which costs extra queries but no added latency. It's the trade-off for overlapping the common case.
5. **List endpoints have no pagination** (projects, clients, work logs, payments, expenses). Not a problem at today's volumes; add server-side pagination before any of these reach thousands of rows.
6. **Notifications** poll every 20 s and also on focus and on tab-visibility changes. When you return to the tab both events fire; the in-flight de-duplication and the 5 s notifications cache collapse them into one request.
7. **Cache scope.** The client cache is per tab and keys don't include the user. That's safe today, because login and logout are POSTs that clear it, and session expiry reloads the page. A change made in another tab or by another user can still show up to 25 s late; that's the cache's intended trade-off.
