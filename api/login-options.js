import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { ensureSchema } from '../lib/db.js';
import { createChallenge } from '../lib/challenges.js';
import { getRpID, CHALLENGE_TTL_MS } from '../lib/webauthn.js';
import { setCookie } from '../lib/cookies.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  await ensureSchema();

  // No allowCredentials / no username: the browser looks up whichever
  // discoverable passkeys for this site the device already has (T08-C27).
  const options = await generateAuthenticationOptions({
    rpID: getRpID(req),
    userVerification: 'preferred',
  });

  const challengeId = await createChallenge({ type: 'authentication', challenge: options.challenge });
  setCookie(res, 'auth_flow', challengeId, { maxAgeSeconds: CHALLENGE_TTL_MS / 1000 });

  res.status(200).json({ options });
}
