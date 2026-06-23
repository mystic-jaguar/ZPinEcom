# ZPIN Legal Pages — Hosting & Sync

These are the **canonical, publicly-hosted** versions of ZPIN's legal documents. They exist
so the URLs referenced from inside the app actually resolve — an App Store / Google Play
requirement (compliance blocker B7).

| File | Must be published at | Referenced from |
| --- | --- | --- |
| `privacy-policy.html` | `https://www.zpinservices.com/privacy-policy` | `frontend/constants/legal.ts` → `PRIVACY_POLICY_URL`; App Store Connect Privacy Policy URL; Play Data Safety |
| `terms.html` | `https://www.zpinservices.com/terms` | `frontend/constants/legal.ts` → `TERMS_URL` |

## Publishing (owner / infra)
The pages are fully self-contained static HTML (no external CSS/JS/fonts), so any host works:

- **Any static host** — upload both files so the paths above return HTTP 200 over **HTTPS**.
  Map `/privacy-policy` → `privacy-policy.html` and `/terms` → `terms.html` (rewrite the
  extension, or rename the files to match your host's routing).
- Verify after deploy: the URLs load, are publicly reachable (no login), and serve valid TLS.

## Keeping in sync (important)
The exact same text is bundled **inside the app** in
`frontend/components/common/LegalDocModal.tsx` (constants `PRIVACY_POLICY` and
`TERMS_AND_CONDITIONS`). These HTML files were generated from that text.

**If you edit one, update the other** and bump the "Last Updated" date in both, so the
in-app copy and the hosted copy never diverge. The in-app modal's "View latest version
online" link points users to these hosted pages.
