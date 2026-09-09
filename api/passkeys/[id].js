import { ensureSchema, sql } from '../../lib/db.js';
import { getSessionUser } from '../../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'method_not_allowed' });
  await ensureSchema();

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'not_logged_in' });

  const { id } = req.query;

  const owned = await sql`SELECT id FROM credentials WHERE id = ${id} AND user_id = ${user.id}`;
  if (owned.length === 0) return res.status(404).json({ error: 'not_found' });

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM credentials WHERE user_id = ${user.id}`;
  if (count <= 1) {
    // No password fallback exists for this account -- deleting the last passkey
    // would lock it out permanently, so the server refuses (T08-C46, decided
    // with the user: block rather than warn-and-allow).
    return res.status(400).json({ error: 'cannot_delete_last_passkey' });
  }

  await sql`DELETE FROM credentials WHERE id = ${id}`;
  res.status(200).json({ ok: true });
}
