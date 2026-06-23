# ZPIN — App Store Connect Privacy Nutrition Label Worksheet

> Compliance blocker B7 / Report item 2.2#2.
> This worksheet maps the **actual data the ZPinEcom app collects** (verified against the
> frontend source) to Apple's App Store Connect "App Privacy" questionnaire so the owner can
> fill the label accurately. Apple ref: ASRG 5.1.1(i). Also reusable for the Google Play
> Data Safety form.
>
> **Owner action:** App Store Connect → your app → **App Privacy** → *Edit*, and enter the
> answers below. The Privacy Policy URL field there must be set to
> `https://www.zpinservices.com/privacy-policy` (see `docs/legal/README.md` to publish it).

---

## 0. Verified facts (from code — `frontend/`)

| Area | Finding |
| --- | --- |
| Analytics / tracking SDK | **None found** (no Firebase Analytics, Segment, Amplitude, AppsFlyer, Facebook, Sentry, AdMob). → **App Tracking Transparency NOT required.** |
| Payments | `react-native-razorpay` — payment data handled by Razorpay; app does **not** store card/CVV/UPI PIN (Privacy Policy §3.3). |
| Auth | `@react-native-google-signin/google-signin` + `expo-apple-authentication` (email/password & OTP also). |
| Location | `expo-location` — precise location, **when-in-use only**, for "nearby availability"/delivery. No background/Always. |
| Firebase | `google-services.json` / `GoogleService-Info.plist` present (Google Sign-In / phone-auth config only). **Verified:** no Firebase **Analytics**/Crashlytics or any analytics/crash SDK in `package.json` → the "no Diagnostics collection" answer holds. |

---

## 1. Does this app collect data? → **YES**

## 2. Data types collected (answer "Yes — collected")

For each type below, Apple asks: *(a)* used for tracking across apps/sites → **NO for all**
(no tracking SDK); *(b)* linked to the user's identity → **YES for all** (tied to the
account); *(c)* purposes.

| Apple data type | Collected? | Specific data | Linked to user | Used for tracking | Purposes |
| --- | --- | --- | --- | --- | --- |
| **Contact Info → Name** | Yes | Full name | Yes | No | App Functionality |
| **Contact Info → Email Address** | Yes | Account email | Yes | No | App Functionality, (optional) Marketing if you email promos |
| **Contact Info → Phone Number** | Yes | Mobile number (OTP) | Yes | No | App Functionality |
| **Contact Info → Physical Address** | Yes | Delivery & billing address (stored AES-256-GCM encrypted) | Yes | No | App Functionality |
| **Financial Info → Payment Info** | Yes | Processed by Razorpay; app does not retain card/CVV/UPI PIN | Yes | No | App Functionality |
| **Financial Info → Purchase History** | Yes | Orders, cart, transaction value, returns/refunds | Yes | No | App Functionality |
| **Location → Precise Location** | Yes | Device location for nearby availability / delivery tracking | Yes | No | App Functionality |
| **Identifiers → User ID** | Yes | Account ID; Google/Apple sign-in subject | Yes | No | App Functionality |
| **Usage Data → Product Interaction** | Optional | Only if you treat browsing/recommendations server-side as collection | Yes | No | App Functionality, Personalization |

### Data types NOT collected by the app (answer "Not Collected")
- Health & Fitness, Sensitive Info, Contacts (address book), Browsing History,
  Search History (server-side product search is App Functionality, not Safari browsing),
  Audio Data, Photos/Videos (**verified:** no `image-picker`/`camera`/`media-library`
  dependency and no avatar/photo upload in the customer app),
  Diagnostics/Crash Data (no crash SDK found).

> ⚠️ **Identifiers → Device ID / Diagnostics:** if you later add Firebase Analytics,
> Crashlytics, or any ads/attribution SDK, you MUST revisit this label and likely the ATT
> prompt. Today: none present.

## 3. Tracking (ATT) → **NO**
No SDK collects data to track users across other companies' apps/websites, so do **not**
enable `NSUserTrackingUsageDescription` / the ATT prompt. (Matches handoff §4.)

## 4. Third-party SDKs — disclose their collection too
Apple requires you to account for data collected by embedded SDKs:
- **Razorpay** — payment info, device identifiers, transaction data (for App Functionality).
- **Google Sign-In** — email, name, user identifier (for App Functionality / authentication).
- **Sign in with Apple** — email (or private relay), name on first sign-in (minimal).

Confirm each SDK's current privacy manifest and reflect any additional types above.

---

## 5. Pre-submission checklist (B7)

- [ ] Publish `docs/legal/privacy-policy.html` at `https://www.zpinservices.com/privacy-policy` (resolves over HTTPS, 200). See `docs/legal/README.md`.
- [ ] Publish `docs/legal/terms.html` at `https://www.zpinservices.com/terms`.
- [ ] App Store Connect → **App Privacy**: enter the data types in §2; Tracking = No (§3).
- [ ] App Store Connect → App Information → **Privacy Policy URL** = the published URL.
- [ ] Google Play Console → **Data safety** form: mirror §2 (Play uses similar categories).
- [ ] In-app link verified — `LegalDocModal` opens from Profile and Signup, and "View latest version online" opens the hosted URL (already wired in `frontend/components/common/LegalDocModal.tsx` + `constants/legal.ts`).
- [x] Confirmed (code-verified 2026-06-23): no avatar/photo upload and no analytics/crash SDK. Re-verify only if such a dependency is later added.

> Note: this label depends on blocker **B1 (HTTPS)** being done — the privacy policy URL and
> all API traffic must be served over TLS, not the current cleartext `http://195.35.20.40`.
