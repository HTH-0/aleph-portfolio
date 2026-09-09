import { ensureSchema } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';

// Lets the frontend know on page load whether to render the private area
// locked or unlocked, without ever embedding private content in the page itself.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  await ensureSchema();

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'not_logged_in' });

  res.status(200).json({ username: user.username });
}
