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

**Captured from production:** `search-results-badges.png` (and `-dark`) — public homepage search with the Charleston wedding intake. Recapture with `--base-url https://app.hello-envoy.com --path search-results-badges`.

**Requires local dev with seeded users:** Account, Chat, consent, dashboard, project workspace, contacts, outreach, and vendor pending screenshots. Run `npm run capture-screenshots:all` from the docs repo root (captures light and dark).

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
| `project-wizard.png` | `project-wizard-dark.png` | `/dashboard` | New project wizard Essentials. Stale: shows the previous sidebar. Not used on a page until recaptured. |
| `journey-overview.svg` | — | — | Unused placeholder |

## Needs a local capture

These files still show the previous sidebar or the Overview / Chat / Outreach tabs. Help Center pages no longer use them. Recapture light and dark from a local build of the three-tab planner before putting them back on a page. Do not draw replacements.

The Dev app at https://dev-app.hello-envoy.com already serves the new planner (the white wordmark is there). The capture script cannot sign in there: its seeded account is sent back to the sign-in page, and the product repo is not available in this checkout to boot a local app. These shots still need a local capture.

| Files | What to capture |
|-------|-----------------|
| `projects/dashboard-empty.png`, `projects/dashboard-empty-dark.png` | **Dashboard** with no projects, including the left side |
| `projects/dashboard-populated.png`, `projects/dashboard-populated-dark.png` | **Dashboard** with recent projects, including the left side |
| `projects/project-wizard.png`, `projects/project-wizard-dark.png`, `getting-started/project-wizard.png`, `getting-started/project-wizard-dark.png` | New project **Essentials**, including the left side |
| `projects/project-overview.png`, `projects/project-overview-dark.png` | A wedding open on **Today** |
| `projects/project-chat.png`, `projects/project-chat-dark.png` | **Ask Envoy** open on a wedding |
| `outreach/new-message.png`, `outreach/new-message-dark.png` | **Contacts** → **Inbox** with a draft |
| `outreach/attach-files.png`, `outreach/attach-files-dark.png` | A file attached on that draft |
| `account/account-settings.png`, `account/account-settings-dark.png` | **Account** opened from **Settings**, including the left side |
| `account/email-connections.png`, `account/email-connections-dark.png` | **Connected Email Accounts**, without the old sidebar |

Also capture, with no current file: **Project** with **Edit project details**, **Contacts** → **All**, the account menu (**Settings**, **Help Center**, **Give Feedback**, **Logout**), and the white Envoy logo at the top left in dark mode.

These crops do not show the old sidebar, and the panels they show did not move, so pages still use them: `contacts-page`, `project-contacts-toolbar`, `import-contacts-upload`, `import-contacts-review`, `data-privacy`, `default-location`, and the public getting-started images other than the project wizard.

Older `.svg` files in the same folders are unused placeholders of the previous layout. Replace them only when a real capture exists.

## projects/

| File | Dark | Page | Notes |
|------|------|------|-------|
| `dashboard-empty.png` | `dashboard-empty-dark.png` | `/dashboard` | No projects yet. Stale: previous sidebar. Not used until recaptured. |
| `dashboard-populated.png` | `dashboard-populated-dark.png` | `/dashboard` | Recent projects. Stale: previous sidebar. Not used until recaptured. |
| `project-wizard.png` | `project-wizard-dark.png` | `/dashboard` | New project wizard Essentials. Stale: shows the previous sidebar. Not used on a page until recaptured. |
| `project-overview.png` | `project-overview-dark.png` | `/projects/:uuid` | Stale: Overview / Chat / Outreach. Recapture **Today**. Not used until then. |
| `project-chat.png` | `project-chat-dark.png` | `/projects/:uuid` | Stale: Chat tab. Recapture **Ask Envoy**. Not used until then. |
| `contacts-page.png` | `contacts-page-dark.png` | `/contacts` | Contacts directory from production. **Import from file** sits next to **Find additional contacts** and **Edit**. |
| `import-contacts-upload.png` | `import-contacts-upload-dark.png` | `/contacts` and **All** | Crop of **Import contacts from a file** before a file is chosen. Still used. |
| `import-contacts-review.png` | `import-contacts-review-dark.png` | same panel | Production capture of the review step after a `.csv` file. **Found 2 contacts in** the file, then **Import 2 contacts**. |
| `project-contacts-toolbar.png` | `project-contacts-toolbar-dark.png` | `/projects/:uuid` **All** | Crop after **Edit** (**Done** is showing). Still used. The row action is **Detach**. |

## outreach/

| File | Dark | Page | Notes |
|------|------|------|-------|
| `new-message.png` | `new-message-dark.png` | `/projects/:uuid` **Inbox** | Stale: Outreach tab. Recapture a draft in **Inbox**. Not used until then. |
| `attach-files.png` | `attach-files-dark.png` | `/projects/:uuid` **Inbox** | Stale: Outreach tab. Recapture an attached file in **Inbox**. Not used until then. |

## account/

| File | Dark | Page | Notes |
|------|------|------|-------|
| `account-settings.png` | `account-settings-dark.png` | `/account` | Stale: previous sidebar. Recapture **Account** from **Settings**. Not used until then. |
| `email-connections.png` | `email-connections-dark.png` | `/account#email-accounts` | Stale: previous sidebar is in the frame. Recapture **Connected Email Accounts**. Not used until then. |
| `data-privacy.png` | `data-privacy-dark.png` | `/account` | Data & Privacy section (cropped) |
| `default-location.png` | `default-location-dark.png` | `/account` | Default project location section (cropped) |
| `vendor-pending.png` | `vendor-pending-dark.png` | `/vendor/pending` | Pro pending approval |

## Legacy placeholders

Older docs referenced `.svg` placeholders in the same paths. Help center pages use `.png` light/dark pairs.
