import { ensureSchema, sql } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';

// NOTE for T08-C40/C41: this endpoint accepts an optional ?userId= query
// parameter, but it is intentionally never read below. Ownership is derived
// solely from the session cookie via getSessionUser() -- a request that names
// a different account here still returns only the caller's own items. This is
// the source location referenced in the write-up for "where the rejection is enforced".
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  await ensureSchema();

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'not_logged_in' });

  const items = await sql`
    SELECT id, title, body, created_at
    FROM private_items
    WHERE user_id = ${user.id}
    ORDER BY created_at ASC
  `;

  res.status(200).json({ items });
}
