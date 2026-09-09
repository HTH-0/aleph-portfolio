import { randomUUID } from 'node:crypto';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { ensureSchema, sql } from '../lib/db.js';
import { consumeChallenge } from '../lib/challenges.js';
import { getRpID, getOrigin } from '../lib/webauthn.js';
import { parseCookies, clearCookie } from '../lib/cookies.js';
import { createSession } from '../lib/session.js';

// Placeholder content so a brand-new account immediately satisfies "3 or more
// private items" (T08-C14). Meant to be replaced with real content later.
const SAMPLE_ITEMS = [
  { title: '프로젝트 메모 (예시)', body: '준비 중인 프로젝트 아이디어를 적어두는 자리입니다. 지금은 예시 텍스트로 채워져 있습니다.' },
  { title: '지원 목록 (예시)', body: '지원하려는 곳과 진행 상황을 정리하는 자리입니다. 실제 내용으로 바꿔서 사용하세요.' },
  { title: '회고 (예시)', body: '스스로에게 남기는 회고를 적는 공간입니다. 이 텍스트는 자리표시자입니다.' },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  await ensureSchema();

  const { nickname, response } = req.body || {};
  const trimmedNickname = typeof nickname === 'string' ? nickname.trim() : '';
  if (!trimmedNickname || !response) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  const cookies = parseCookies(req);
  const flowId = cookies.reg_flow;
  if (!flowId) return res.status(400).json({ error: 'no_registration_in_progress' });

  // Consuming here means: cancel the browser prompt and never call this endpoint
  // -> nothing is ever written to the DB (T08-C25). Call it twice with a replayed
  // response -> the second call finds no row here and is rejected (T08-C20/C31 style reuse check).
  const challengeRow = await consumeChallenge(flowId, 'registration');
  clearCookie(res, 'reg_flow');
  if (!challengeRow) {
    return res.status(400).json({ error: 'registration_expired_or_already_used' });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpID(req),
    });
  } catch (err) {
    return res.status(400).json({ error: 'verification_failed', message: err.message });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return res.status(400).json({ error: 'verification_failed' });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const isNewAccount = Boolean(challengeRow.pending_user_id);
  const userId = isNewAccount ? challengeRow.pending_user_id : challengeRow.user_id;

  try {
    if (isNewAccount) {
      await sql`INSERT INTO users (id, username) VALUES (${userId}, ${challengeRow.pending_username})`;
    }

    // credential.publicKey (from the library) is the value that must be stored --
    // it is a public key, never a secret. The signing private key never leaves
    // the authenticator and is never present in this request body at all (T08-C23).
    await sql`
      INSERT INTO credentials (id, user_id, public_key, counter, device_type, backed_up, transports, nickname)
      VALUES (${credential.id}, ${userId}, ${Buffer.from(credential.publicKey)}, ${credential.counter},
              ${credentialDeviceType}, ${credentialBackedUp}, ${credential.transports ?? []}, ${trimmedNickname})
    `;

    if (isNewAccount) {
      for (const item of SAMPLE_ITEMS) {
        await sql`INSERT INTO private_items (id, user_id, title, body) VALUES (${randomUUID()}, ${userId}, ${item.title}, ${item.body})`;
      }
    }
  } catch (err) {
    if (err.message?.includes('duplicate key')) {
      return res.status(409).json({ error: 'already_registered' });
    }
    throw err;
  }

  await createSession(res, userId);
  res.status(200).json({ ok: true });
}
