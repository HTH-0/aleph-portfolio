import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { ensureSchema, sql } from '../lib/db.js';
import { consumeChallenge } from '../lib/challenges.js';
import { getRpID, getOrigin } from '../lib/webauthn.js';
import { parseCookies, clearCookie } from '../lib/cookies.js';
import { createSession } from '../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  await ensureSchema();

  const { response } = req.body || {};
  if (!response || typeof response.id !== 'string') {
    return res.status(400).json({ error: 'invalid_request' });
  }

  const cookies = parseCookies(req);
  const flowId = cookies.auth_flow;
  if (!flowId) return res.status(401).json({ error: 'no_login_in_progress' });

  // Same atomic consume-once pattern as registration: replaying an old login
  // response with a stale auth_flow cookie finds no row and is rejected (T08-C31).
  const challengeRow = await consumeChallenge(flowId, 'authentication');
  clearCookie(res, 'auth_flow');
  if (!challengeRow) {
    return res.status(401).json({ error: 'login_expired_or_challenge_already_used' });
  }

  const rows = await sql`SELECT * FROM credentials WHERE id = ${response.id}`;
  const credRow = rows[0];
  if (!credRow) {
    return res.status(401).json({ error: 'unknown_credential' });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpID(),
      // This is the stored public key from registration -- the actual signature
      // check happens inside the library against this value.
      credential: {
        id: credRow.id,
        publicKey: new Uint8Array(credRow.public_key),
        counter: Number(credRow.counter),
        transports: credRow.transports ?? undefined,
      },
    });
  } catch (err) {
    return res.status(401).json({ error: 'verification_failed', message: err.message });
  }

  if (!verification.verified) {
    return res.status(401).json({ error: 'verification_failed' });
  }

  await sql`UPDATE credentials SET counter = ${verification.authenticationInfo.newCounter} WHERE id = ${credRow.id}`;
  await createSession(res, credRow.user_id);

  res.status(200).json({ ok: true });
}
