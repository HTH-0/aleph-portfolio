import { ensureSchema, sql } from '../../lib/db.js';
import { getSessionUser } from '../../lib/session.js';

// Fetching another account's item id (T08-C37/C38) hits the same WHERE clause
// below -- user_id must match the session's own id, so it comes back 404
// regardless of whether the id exists under a different account.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  await ensureSchema();

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'not_logged_in' });

  const { id } = req.query;
  const rows = await sql`
    SELECT id, title, body, created_at
    FROM private_items
    WHERE id = ${id} AND user_id = ${user.id}
  `;

  if (rows.length === 0) return res.status(404).json({ error: 'not_found' });
  res.status(200).json({ item: rows[0] });
}
