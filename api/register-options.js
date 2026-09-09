import { randomUUID } from 'node:crypto';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { ensureSchema, sql } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';
import { createChallenge } from '../lib/challenges.js';
import { getRpID, RP_NAME, CHALLENGE_TTL_MS } from '../lib/webauthn.js';
import { setCookie } from '../lib/cookies.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  await ensureSchema();

  // Logged in already -> this is "add another passkey to my account" (card 4).
  // Not logged in -> this is registering a brand new account.
  const sessionUser = await getSessionUser(req);

  let userId;
  let username;
  let excludeCredentials;
  let pendingUsername = null;

  if (sessionUser) {
    userId = sessionUser.id;
    username = sessionUser.username;
    const existing = await sql`SELECT id, transports FROM credentials WHERE user_id = ${userId}`;
    excludeCredentials = existing.map((c) => ({ id: c.id, transports: c.transports ?? undefined }));
  } else {
    const rawUsername = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    if (!rawUsername || rawUsername.length > 40) {
      return res.status(400).json({ error: 'invalid_username' });
    }
    const taken = await sql`SELECT 1 FROM users WHERE username = ${rawUsername}`;
    if (taken.length > 0) {
      return res.status(409).json({ error: 'username_taken' });
    }
    userId = randomUUID();
    username = rawUsername;
    pendingUsername = rawUsername;
    excludeCredentials = [];
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpID(req),
    userName: username,
    userDisplayName: username,
    userID: Buffer.from(userId),
    excludeCredentials,
    // 'required' guarantees a discoverable (resident) credential, which is what
    // makes the passwordless/Conditional UI login flow possible later.
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
  });

  const challengeId = await createChallenge({
    type: 'registration',
    challenge: options.challenge,
    userId: sessionUser ? userId : null,
    pendingUsername,
    pendingUserId: sessionUser ? null : userId,
  });

  setCookie(res, 'reg_flow', challengeId, { maxAgeSeconds: CHALLENGE_TTL_MS / 1000 });
  res.status(200).json({ options });
}
