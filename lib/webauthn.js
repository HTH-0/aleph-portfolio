// WebAuthn credentials are cryptographically bound to a single domain (the "RP ID"),
// and the browser rejects any RP ID that isn't an exact match (or registrable
// suffix) of the page's actual hostname. Vercel's env vars (e.g.
// VERCEL_PROJECT_PRODUCTION_URL) can disagree with that in practice, so instead
// we read the Host header off the actual incoming request -- that's guaranteed
// to match whatever domain the browser is really on.
export function getRpID(req) {
  if (process.env.RP_ID) return process.env.RP_ID;
  const host = req?.headers?.host;
  if (host) return host.split(':')[0];
  return 'localhost';
}

export function getOrigin(req) {
  if (process.env.ORIGIN) return process.env.ORIGIN;
  const host = req?.headers?.host;
  if (host) {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    return `${proto}://${host}`;
  }
  return 'http://localhost:3000';
}

export const RP_NAME = 'Learning Portfolio';

// Registration/authentication challenges are single-use and short-lived.
export const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// Server sessions last a week; logging out deletes the row immediately (T08-C33).
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
