# Screenshot inventory

Screenshots referenced in help center docs. Capture from https://app.hello-envoy.com (or local dev).

Each PNG has a dark-mode sibling named `*-dark.png`. Docs pages show the light file in light mode and the dark file in dark mode.

Run from repo root (requires Playwright and a running Envoy app with seeded data):

```bash
npm install -D playwright && npx playwright install chromium

# Public pages only (no local app required) — both themes:
node scripts/capture-screenshots.mjs --base-url https://app.hello-envoy.com --path getting-started

# All pages including Account, Chat, and consent (local dev required):
# PASSWORD_AUTH_ENABLED=true node ace serve --no-clear  # in envoy-project-management
node scripts/capture-screenshots.mjs --base-url http://127.0.0.1:18080

# One theme or one path:
node scripts/capture-screenshots.mjs --base-url http://127.0.0.1:18080 --scheme dark
node scripts/capture-screenshots.mjs --base-url https://app.hello-envoy.com --path search-results-badges
```

Production sign-in is **Continue with Google** or **Continue with Microsoft**. For signed-in shots, open a headed browser and sign in once. The session stays in `.playwright/envoy-profile`, which is gitignored:

```bash
node scripts/capture-screenshots.mjs --base-url https://app.hello-envoy.com --manual-auth
node scripts/capture-screenshots.mjs --base-url https://app.hello-envoy.com --manual-auth --signed-in-only --path mobile-tabs
```

**Captured from production** on the three-tab planner: the public homepage, registration, dashboard, project wizard, **Today**, **Ask Envoy**, **Project**, **Contacts** → **All**, **Inbox** drafts, attachments, **Account**, **Connected Email Accounts**, the account menu, and the phone tab row. Use a demo wedding. The script replaces names, email addresses, phone numbers, and street addresses before it writes a file.

**Not recaptured.** These files are unchanged. `dashboard-empty` is not on a page. `consent-preferences` and `vendor-pending` are still on their pages:

| Files | Why |
|-------|-----|
| `projects/dashboard-empty.png`, `projects/dashboard-empty-dark.png` | Production has no email-and-password sign-up for an empty account. |
| `getting-started/consent-preferences.png`, `getting-started/consent-preferences-dark.png` | A signed-in account is sent away from `/onboarding/consent`. |
| `account/vendor-pending.png`, `account/vendor-pending-dark.png` | A consumer account cannot open `/vendor/pending`. |

Playwright is resolved from `../envoy-project-management/node_modules/playwright` when not installed in this repo.

Dark captures set the app to **Dark** via `prefers-color-scheme` and `localStorage color-mode`.

`npm run capture-screenshots:all` overlays wedding-themed screenshot data after seed (Maya Hart planning **Our Charleston Wedding**, contacts like Petal & Stem). That overlay lives in `scripts/seed-screenshot-wedding-data.mjs` so PM test fixtures stay unchanged.

## getting-started/

| File | Dark | Page | Notes |
|------|------|------|-------|
| `landing-intake.png` | `landing-intake-dark.png` | `/` | Intake form with description + ZIP |
| `search-results-badges.png` | `search-results-badges-dark.png` | `/` | Results with Onboarded/Unverified badges |
| `registration-form.png` | `registration-form-dark.png` | `/register` | Create account + mailbox checkbox |
| `consent-preferences.png` | `consent-preferences-dark.png` | `/onboarding/consent` | Choose your data preferences |
| `project-wizard.png` | `project-wizard-dark.png` | `/dashboard` | New project **Essentials** |
| `journey-overview.svg` | — | — | Unused placeholder |

## projects/

| File | Dark | Page | Notes |
|------|------|------|-------|
| `dashboard-empty.png` | `dashboard-empty-dark.png` | `/dashboard` | No projects yet. Not recaptured. Not used on a page. |
| `dashboard-populated.png` | `dashboard-populated-dark.png` | `/dashboard` | Recent projects. Dark capture includes the white Envoy logo. |
| `project-wizard.png` | `project-wizard-dark.png` | `/dashboard` | New project **Essentials** |
| `project-overview.png` | `project-overview-dark.png` | `/projects/:uuid` | **Today** |
| `project-chat.png` | `project-chat-dark.png` | `/projects/:uuid` | **Ask Envoy** open on a wedding |
| `project-details.png` | `project-details-dark.png` | `/projects/:uuid` | **Project** with **Edit project details** |
| `contacts-all.png` | `contacts-all-dark.png` | `/projects/:uuid` | **Contacts**, then **All** |
| `mobile-ask-envoy.png` | `mobile-ask-envoy-dark.png` | `/projects/:uuid` | **Ask Envoy** filling a phone screen |
| `mobile-tabs.png` | `mobile-tabs-dark.png` | `/projects/:uuid` | Phone row after **Contacts**: **Inbox**, **Compare**, and **All**, with **Today** and **Project** beside them |
| `contacts-page.png` | `contacts-page-dark.png` | `/contacts` | Contacts directory. **Import from file** sits next to **Find additional contacts** and **Edit**. |
| `import-contacts-upload.png` | `import-contacts-upload-dark.png` | `/contacts` and **All** | Crop of **Import contacts from a file** before a file is chosen. Still used. |
| `import-contacts-review.png` | `import-contacts-review-dark.png` | same panel | Production capture of the review step after a `.csv` file. **Found 2 contacts in** the file, then **Import 2 contacts**. |
| `project-contacts-toolbar.png` | `project-contacts-toolbar-dark.png` | `/projects/:uuid` **All** | Crop after **Edit** (**Done** is showing). Still used. The row action is **Detach**. |

## outreach/

| File | Dark | Page | Notes |
|------|------|------|-------|
| `new-message.png` | `new-message-dark.png` | `/projects/:uuid` **Inbox** | A draft in **Contacts**, then **Inbox** |
| `attach-files.png` | `attach-files-dark.png` | `/projects/:uuid` **Inbox** | A file attached on that draft |

## account/

| File | Dark | Page | Notes |
|------|------|------|-------|
| `account-settings.png` | `account-settings-dark.png` | `/account` | **Account** opened from **Settings** |
| `account-menu.png` | `account-menu-dark.png` | planner shell | **Settings**, **Help Center**, **Give Feedback**, and **Logout** |
| `email-connections.png` | `email-connections-dark.png` | `/account#email-accounts` | **Connected Email Accounts** |
| `data-privacy.png` | `data-privacy-dark.png` | `/account` | Data & Privacy section (cropped) |
| `default-location.png` | `default-location-dark.png` | `/account` | Default project location section (cropped) |
| `vendor-pending.png` | `vendor-pending-dark.png` | `/vendor/pending` | Pro pending approval. Not recaptured. |

## Legacy placeholders

Older docs referenced `.svg` placeholders in the same paths. Help center pages use `.png` light/dark pairs.
