import { ensureSchema, sql } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  await ensureSchema();

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'not_logged_in' });

  // Public key / counter are deliberately left out of this response -- the UI
  // only ever needs the nickname and registration date to render the list (T08-C43).
  const rows = await sql`
    SELECT id, nickname, device_type, backed_up, created_at
    FROM credentials
    WHERE user_id = ${user.id}
    ORDER BY created_at ASC
  `;

  res.status(200).json({ passkeys: rows });
}
