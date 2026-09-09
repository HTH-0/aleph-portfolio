# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A personal learning portfolio (static single-page site) with a WebAuthn/passkey-gated "Private" section added as a full-stack extension for an assignment (`T08 requirement.txt`, Korean). The public portfolio is plain static HTML; the private section is backed by Vercel serverless functions and a dedicated Neon Postgres database.

## Commands

- `npm install` — installs the only two dependencies (`@simplewebauthn/server`, `@neondatabase/serverless`). No build step exists or is needed.
- No lint or test scripts are defined in `package.json`.
- Syntax-check a single file without running it: `node --check <file>`
- Deployment is automatic: pushing to `main` on GitHub triggers a Vercel deploy of the connected project (`aleph-portfolio`). There's no separate build command — Vercel serves everything outside `api/` as static files and auto-detects each `api/**/*.js` file as its own serverless function (Node.js runtime; dynamic segments use bracket filenames like `api/passkeys/[id].js`, and Vercel populates `req.query.id`).
- Local dev (optional): needs the Vercel CLI (`npm i -g vercel`, then `vercel link` and `vercel env pull .env.local` once) and `vercel dev`. WebAuthn treats `localhost` as an https exception, so this works over plain HTTP.

## Architecture

### Two halves of one deployment, no framework
`index.html` + `assets/private.js` is the entire frontend — a static page with `@simplewebauthn/browser` loaded from a CDN `<script>` tag and `assets/private.js` as a plain deferred script (no bundler). `api/*.js` files are individual serverless functions, each exporting a default `async function handler(req, res)`. `"type": "module"` in `package.json` is load-bearing — every `api/`/`lib/` file uses ES `import`/`export`.

### `lib/` — shared logic behind every endpoint
- `lib/db.js` — the Neon client (`sql` tagged template) and `ensureSchema()`, which lazily runs `CREATE TABLE IF NOT EXISTS` on first use per cold start. There's no separate migration tool/step.
- `lib/webauthn.js` — `getRpID(req)`/`getOrigin(req)` derive the WebAuthn relying-party ID and origin from the **incoming request's `Host` header**, deliberately not from `VERCEL_PROJECT_PRODUCTION_URL`. That env var didn't reliably match the browser's actual hostname in production and caused real "RP ID is invalid for this domain" registration failures — don't revert to it.
- `lib/session.js` — server-side sessions (a `sessions` table + random `sid` httpOnly cookie), not JWT, specifically so logout can invalidate a session immediately by deleting the row. `getSessionUser(req)` is the *only* thing any protected endpoint should use to determine identity — never trust a client-supplied user id from a query/body param (see the comment in `api/private-items.js`; the assignment's grading explicitly probes for this).
- `lib/challenges.js` — WebAuthn challenges are consumed exactly once via a single `DELETE ... WHERE id = $1 AND expires_at > now() RETURNING *` (`consumeChallenge`). This one atomic statement is what makes a replayed/reused challenge fail; don't split it into a SELECT-then-DELETE, which would reintroduce a reuse race.
- `lib/cookies.js` — hand-rolled cookie parsing/serialization (no framework provides it). `Secure` is toggled off automatically when `process.env.VERCEL` is unset, for local HTTP dev.

### Registration has two branches in one pair of endpoints
`api/register-options.js` / `api/register-verify.js` handle both "create a brand-new account" (no session cookie, requires `username` in the body) and "add another passkey to my existing account" (session cookie present, username ignored), branching on `getSessionUser(req)`. A new account is not written to `users` until `register-verify` succeeds — an abandoned/cancelled ceremony leaves nothing behind (the pending username sits only in the short-lived `challenges` row until it expires).

### Account isolation
Every private-data query filters by `user_id = <session's own id>`, no exceptions. `api/private-items.js` intentionally accepts-but-ignores a `?userId=` query param on purpose — it exists so the assignment's "cross-account access attempt" scenario has something to probe and observe being ignored, not because it's read anywhere.

### One authenticator = one resident credential per account
Confirmed empirically (see `requirement/card4-lost-device.md`): a single WebAuthn authenticator (real or virtual) can only hold one resident/discoverable credential per (rpId, userHandle). Registering a "second passkey" against the *same* authenticator for an already-registered account overwrites the first rather than adding a second — normal WebAuthn behavior, not an app bug. Demonstrating "two passkeys on one account" requires two distinct authenticators.

### Testing WebAuthn flows without a real device
There's no unit/integration test suite. The only reliable way to exercise a full registration/login ceremony end-to-end — including against the live deployment — is a headless Chromium instance with the Chrome DevTools Protocol WebAuthn domain enabled (`WebAuthn.enable` + `WebAuthn.addVirtualAuthenticator`), driven via Playwright. This produces cryptographically real, spec-valid ceremonies the server can't distinguish from a real authenticator. All the evidence under `requirement/` was captured this way — see `requirement/automated-run-log.json` and the per-card `.md` files for what a working script looks like. Playwright isn't a project dependency (it was installed ad hoc into a scratch directory), so `npm install playwright` plus a Chromium download is needed before reusing this approach.

## Project-specific context

- `T08 requirement.txt` is the assignment brief this feature exists to satisfy. `PROGRESS.md` tracks what's done vs. what still needs manual action from the user (Neon console screenshots, personal reflection writing — things this agent can't do). `SUBMISSION.md` is the actual write-up deliverable; `requirement/` holds supporting evidence organized per assignment "card".
- The Neon Postgres database (`DATABASE_URL`, set via Vercel's Storage integration) is dedicated to this Vercel project only. The user has previously been burned by different projects accidentally sharing one `DATABASE_URL` — don't suggest reusing or pointing this project at any other database.
