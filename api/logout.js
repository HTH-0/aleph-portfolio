import { ensureSchema } from '../lib/db.js';
import { destroySession } from '../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  await ensureSchema();

  // Deletes the sessions row outright, so the old cookie value is immediately
  // rejected by getSessionUser() on any later request (T08-C33).
  await destroySession(req, res);
  res.status(200).json({ ok: true });
}
