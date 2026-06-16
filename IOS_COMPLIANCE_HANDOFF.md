# ZPIN — iOS / App Store Compliance: Handoff for Claude Code

> Purpose: hand off the "Path A" iOS App Store readiness work to Claude Code (CLI).
> This file is the single source of truth to resume. A companion audit spreadsheet,
> `ZPIN_iOS_Migration_Audit.xlsx`, sits in the repo root with the full analysis.

---

## 1. Critical context (read first)

- This repo is **NOT a native Android app**. It is an **Expo / React Native (TypeScript)**
  cross-platform app (`expo ~54`, `react-native 0.81.5`) under `frontend/`, plus a
  **Node/Express + Postgres** backend under `backend/`.
- The codebase **already targets iOS** (`app.json` has an `ios` block; Google Sign-In iOS
  URL scheme is configured; `package.json` has `"ios": "expo run:ios"`).
- **Decision made by the owner: PATH A** — ship the EXISTING Expo/RN codebase on iOS and
  make it App Store compliant. Do **NOT** start a Swift/SwiftUI rewrite. Keep one shared
  codebase; iOS-specific bits go in `app.json` / Expo config and are platform-guarded so
  Android keeps working.
- App: ZPIN, B2C e-commerce. Android bundle id `com.zpin.ecom`. EAS projectId
  `e71bc344-7fa9-4436-aaeb-8aaf1ac044ec`.

## 2. Git / environment constraints (important)

- A working branch was created: **`ios-compliance`**. Do all work there.
- A `.gitattributes` was added at repo root to normalize line endings to LF (the prior
  whole-tree "modified" status was CRLF↔LF churn, not real edits).
- **Required first step (run on the dev's machine, before code edits land cleanly):**
  ```bash
  del .git\index.lock            # stale lock; close IDE/Git GUI first (Windows)
  del .write_test_zpin           # stray empty file, safe to delete
  git checkout ios-compliance
  git add --renormalize .
  git add .gitattributes
  git commit -m "Add .gitattributes; normalize line endings to LF"
  ```
  Claude Code (running locally) CAN do these; the prior cloud sandbox could not (it could
  create/edit files but not delete or commit).
- Recommended workflow: keep each blocker below as its own commit on `ios-compliance`,
  review diffs with `git diff`, merge to `master` only when satisfied.

## 3. Compliance blockers — implementation spec (recommended order)

Severity legend: [BLOCKER] = will cause App Store rejection. Fix all before submission.

### B1. [BLOCKER] Cleartext HTTP API → HTTPS (App Transport Security, ASRG 2.3)
- Problem: `frontend/services/api.ts` hardcodes `PRODUCTION_API_URL =
  'http://195.35.20.40:5002/api/v1/'` (plain HTTP to a bare IP). iOS ATS blocks this.
- Also `app.json` android block has `"usesCleartextTraffic": true`.
- Fix:
  - Provision a real domain + valid TLS cert for the backend (infra task, owner-side).
  - Change the fallback/base URL in `frontend/services/api.ts` to `https://<domain>/api/v1/`.
  - Set `EXPO_PUBLIC_API_URL` to the https URL in EAS build env.
  - Remove `usesCleartextTraffic` (or set false). Do NOT add an ATS arbitrary-loads
    exception in `app.json` ios `infoPlist`.
- Note: backend already has `backend/src/middleware/httpsRedirect.ts` — verify it enforces TLS.

### B2. [BLOCKER] Sign in with Apple (ASRG 4.8)
- Problem: Google Sign-In is offered (`frontend/services/auth.ts`,
  `@react-native-google-signin`) with no Apple equivalent. 4.8 requires a privacy-forward
  login option (Sign in with Apple) when any third-party social login exists.
- Fix (frontend):
  - Add dependency `expo-apple-authentication`.
  - In `app.json` add `"expo-apple-authentication"` to `plugins`; add
    `"usesAppleSignIn": true` under `ios`.
  - Add a "Sign in with Apple" button on `frontend/app/auth/login.tsx` and `signup.tsx`
    (place above other social buttons per HIG). Gate to iOS only.
  - New service fn in `auth.ts`: `signInWithApple()` → obtain identity token + nonce.
- Fix (backend):
  - New endpoint `POST /api/v1/auth/apple` in `backend/src/routes/auth.ts` that verifies
    the Apple identity JWT (validate against Apple public keys, audience, nonce) and
    issues the app's own access/refresh JWT (mirror the existing `/auth/google` flow).
- Apple setup (owner-side): enable "Sign in with Apple" capability for App ID
  `com.zpin.ecom`; create the Service ID / key in the Apple Developer portal.

### B3. [BLOCKER] In-app account deletion (ASRG 5.1.1(v))
- Problem: account creation exists; no in-app deletion path found.
- Fix (frontend): add a "Delete Account" row in `frontend/app/(tabs)/profile.tsx` (or a new
  `frontend/app/profile/delete-account.tsx`) with a confirm dialog (use existing
  `components/common/ActionModal.tsx`). On confirm, call the new endpoint, then clear
  Keychain/session and route to logged-out state.
- Fix (backend): new authenticated `DELETE /api/v1/users/me` (or `users/account`) in
  `backend/src/routes/users.ts` that deletes/anonymises the user row and associated PII
  + UGC (addresses, reviews, cart, wishlist, wallet) within policy. Make it
  transaction-safe.

### B4. [BLOCKER] UGC moderation for product reviews (ASRG 1.2)
- Problem: reviews (`frontend/services/review.ts`, backend `products/:id/reviews`) have no
  report-abuse, block-user, moderation, or EULA.
- Fix (frontend): on review items add a "Report" action and a "Block user" action; add a
  EULA / zero-tolerance notice in the review-submit flow.
- Fix (backend): add `report` + `block` endpoints and a moderation flag/queue; commit to
  acting on reports within 24h (process, not just code).

### B5. [BLOCKER-adjacent / security] Move auth tokens to secure storage
- Problem: `frontend/services/api.ts` stores tokens/user data in AsyncStorage
  (`@zpin_access_token`, `@zpin_refresh_token`, `@zpin_user_data`) — unencrypted.
- Fix: add `expo-secure-store` and store access/refresh tokens there (Keychain on iOS,
  Keystore on Android). Keep non-sensitive cache in AsyncStorage. Update the axios
  request/response interceptors and refresh logic accordingly.

### B6. Location permission — contextual, when-in-use only (ASRG 5.1.1 / 5.1.5)
- `expo-location` purpose strings already drafted in `app.json`. Ensure precise location is
  requested **at point of use** (the "nearby availability" feature, `products/nearby`),
  not at launch; offer a graceful fallback when denied; no background/Always location.

### B7. Privacy Nutrition Label + privacy policy (ASRG 5.1.1(i))
- Owner-side in App Store Connect: complete the privacy label for data collected:
  phone, email, name, physical address, purchases, payment info (via Razorpay),
  identifiers/diagnostics (Firebase). Host a privacy policy URL; link it in-app
  (`frontend/app/profile/help-center.tsx` / `LegalDocModal`) and on the store listing.

### B8. Housekeeping
- `expo-updates` (OTA): keep JS/asset-only; never change app's primary purpose (ASRG 2.5.2/3.3.1).
- `keepAlive.ts`: do NOT add iOS background modes/BGTask to keep the server warm (ASRG 2.5.4);
  fix backend cold-start (warm instance) instead.
- Remove backend-only deps (`pg`, `sharp`) from `frontend` devDependencies so they can't
  bundle into the app.
- iPad: `supportsTablet: true` is set — either verify adaptive layouts or set it false.

## 4. Verdicts that are already SAFE (no change needed)
- Razorpay / COD / ZPIN wallet for **physical goods** — Apple IAP is NOT required
  (ASRG 3.1.3(e) / 3.1.5(a)). Do not sell digital content through these. Note this in
  App Store review notes.
- No advertiser/tracking SDK found → App Tracking Transparency NOT required (unless added).
- No client push notifications currently → no notification permission needed.

## 5. Suggested task order for Claude Code
1. Confirm on branch `ios-compliance`; do the normalization commit (section 2).
2. B5 (Keychain) — low risk, high value, no infra dependency.
3. B1 (HTTPS) — code is quick; needs the TLS domain from infra.
4. B3 (account deletion) — frontend + backend, self-contained.
5. B2 (Sign in with Apple) — frontend + backend + Apple portal setup.
6. B4 (UGC report/block/moderation).
7. B6 (location-in-context), B7 (privacy label/policy), B8 (housekeeping).
8. iOS polish (SF Symbols, large titles, launch screen, device QA), then EAS Build + TestFlight.

## 6. Pointers
- Full analysis with severity colouring: `ZPIN_iOS_Migration_Audit.xlsx` (10 tabs:
  exec summary, feature audit, screen mapping, SDK audit, API inventory, permissions,
  compliance audit, iOS architecture, migration strategy, risk assessment).
- Frontend routes: `frontend/app/**` (Expo Router). Services: `frontend/services/*.ts`.
  State: `frontend/context/*Context.tsx`. Backend routes: `backend/src/routes/*.ts`.
- Backend API base: `/api/v1`. Auth: JWT (access + refresh) + HttpOnly cookie.
