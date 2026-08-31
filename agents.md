# Agents Guide

This file is for coding agents working on Leaves. Read it before changing the project.

## Project Snapshot

Leaves is a Windows-first personal travel record app. The current runnable product is the Node + vanilla JS prototype in `apps/desktop-prototype/`; the future target is a Tauri + React + SQLite desktop app.

Core goals:

- Record trips with minimal input.
- Keep the first screen focused on quick add, current-trip map, and the recent trip strip.
- Preserve per-account data isolation.
- Keep the app useful offline through local assets and manual fallback flows.

## Commands

Run from the repository root:

```powershell
npm install
npm start
```

The dev server defaults to `http://127.0.0.1:4173`.

Useful environment variables:

- `LEAVES_PORT`: local server port.
- `LEAVES_HOST`: bind host; use `127.0.0.1` for local and production reverse-proxy setups unless there is a specific reason.
- `LEAVES_DATA_DIR`: persistent data directory.
- `LEAVES_MAX_USERS`: account cap, default `5`.
- `LEAVES_SESSION_DAYS`: session cookie lifetime.
- `LEAVES_READ_ONLY`: set to `1` for read-only demo mode.

## Important Files

- `apps/desktop-prototype/index.html`: app shell and modal markup.
- `apps/desktop-prototype/styles.css`: layout, responsive behavior, and visual system.
- `apps/desktop-prototype/app.js`: client state, rendering, trip CRUD, map behavior, rail and flight workflows.
- `apps/desktop-prototype/dev-server.js`: static server, auth/session APIs, data APIs, and 12306 helper routes.
- `apps/desktop-prototype/server/auth-service.js`: username/password auth, password hashing, sessions, and max-user enforcement.
- `apps/desktop-prototype/server/ticket-service.js`: 12306 station, train-route, train-number, transfer, and current-time helpers.
- `apps/desktop-prototype/vendor/`: checked-in offline browser assets; avoid regenerating or replacing vendor files unless that is the explicit task.
- `docs/AUTH_SQLITE_PLAN.md`: planned SQLite auth/storage design; do not describe it as implemented.

## Product And UX Rules

- Keep the prototype as an actual app screen, not a marketing landing page.
- Mobile must follow a one-screen interaction model: compact top quick-add, map-first current trip, and a short bottom trip strip in the same viewport.
- Do not reintroduce the realtime remaining-ticket UI. Public `/api/12306/query-tickets` and `/api/12306/query-ticket-price` routes are intentionally absent.
- Railway flows should focus on station search, train-route lookup, train-number conversion, transfer lookup, and manual fallback.
- Flight registration is manual-only. Do not add OCR, photo upload, local timetable lookup, or OpenSky-backed flight lookup unless the user explicitly changes this product direction.

## Data And Security Rules

- Keep the account cap at 5 unless the user explicitly changes the product requirement.
- Do not store plaintext passwords. Password handling belongs in `auth-service.js`; preserve salted `scrypt` hashing and timing-safe verification.
- Keep trip data scoped by user. Browser storage keys and server files must not mix trips between accounts.
- Treat files under `apps/desktop-prototype/data/` as local runtime data, not source fixtures.

## Coding Notes

- Prefer the existing vanilla JS + CSS patterns in the prototype; do not introduce a framework inside `apps/desktop-prototype/`.
- Keep changes scoped. Avoid unrelated redesigns, generated metadata churn, or vendor updates.
- The repo may have user edits in progress. Inspect diffs before editing and do not revert work you did not make.
- Use `rg` for searching. Keep Windows PowerShell compatibility in commands and docs.
- When editing responsive layout, test narrow mobile widths around 360-430 px and short heights around 640-740 px.

## Verification Checklist

Before handing off UI or API changes, run the relevant checks:

- `npm start` to ensure the local server boots.
- Load `http://127.0.0.1:4173` and verify login/register still gates the app.
- Smoke-test quick add for rail and flight entries.
- Verify mobile layout at a phone-sized viewport: no horizontal overflow, no overlapping controls, and the quick-add, Hero, and trip strip remain usable in one screen.
- Search for removed feature strings such as `实时余票`, `query-tickets`, and `query-ticket-price` when removing the remaining-ticket feature.
