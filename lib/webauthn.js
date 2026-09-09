// WebAuthn credentials are cryptographically bound to a single domain (the "RP ID").
// We read the domain from Vercel's own env vars instead of hardcoding it, so this
// works before a custom domain is decided (see project memory: T08 passkey design).
export function getRpID() {
  if (process.env.RP_ID) return process.env.RP_ID;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return 'localhost';
}

export function getOrigin() {
  if (process.env.ORIGIN) return process.env.ORIGIN;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'http://localhost:3000';
}

export const RP_NAME = 'Learning Portfolio';

// Registration/authentication challenges are single-use and short-lived.
export const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// Server sessions last a week; logging out deletes the row immediately (T08-C33).
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
