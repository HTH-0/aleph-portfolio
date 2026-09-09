import { randomBytes } from 'node:crypto';
import { sql } from './db.js';
import { parseCookies, setCookie, clearCookie } from './cookies.js';
import { SESSION_TTL_MS } from './webauthn.js';

const SESSION_COOKIE = 'sid';

export async function createSession(res, userId) {
  const id = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sql`INSERT INTO sessions (id, user_id, expires_at) VALUES (${id}, ${userId}, ${expiresAt})`;
  setCookie(res, SESSION_COOKIE, id, { maxAgeSeconds: SESSION_TTL_MS / 1000 });
  return id;
}

// Returns { id, username } for a valid, unexpired session, or null.
// Every protected endpoint derives "who is asking" ONLY from this cookie lookup --
// never from a client-supplied user id in the body/query (see T08-C40/C41).
export async function getSessionUser(req) {
  const cookies = parseCookies(req);
  const sid = cookies[SESSION_COOKIE];
  if (!sid) return null;

  const rows = await sql`
    SELECT users.id, users.username
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = ${sid} AND sessions.expires_at > now()
  `;
  return rows[0] ?? null;
}

export async function destroySession(req, res) {
  const cookies = parseCookies(req);
  const sid = cookies[SESSION_COOKIE];
  if (sid) {
    await sql`DELETE FROM sessions WHERE id = ${sid}`;
  }
  clearCookie(res, SESSION_COOKIE);
}
