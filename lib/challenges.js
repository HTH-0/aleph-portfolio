import { randomBytes } from 'node:crypto';
import { sql } from './db.js';
import { CHALLENGE_TTL_MS } from './webauthn.js';

export async function createChallenge({ type, challenge, userId = null, pendingUsername = null, pendingUserId = null }) {
  const id = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  await sql`
    INSERT INTO challenges (id, type, user_id, pending_username, pending_user_id, challenge, expires_at)
    VALUES (${id}, ${type}, ${userId}, ${pendingUsername}, ${pendingUserId}, ${challenge}, ${expiresAt})
  `;
  return id;
}

// Reads AND deletes the row in one atomic statement, so a challenge can never be
// consumed twice -- a replayed WebAuthn response finds no row here and is
// rejected (T08-C31). Also filters out expired rows, which handles the "started
// registration/login but never finished" cleanup case implicitly.
export async function consumeChallenge(id, type) {
  const rows = await sql`
    DELETE FROM challenges
    WHERE id = ${id} AND type = ${type} AND expires_at > now()
    RETURNING *
  `;
  return rows[0] ?? null;
}
