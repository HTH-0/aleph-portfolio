import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL);

let schemaReady = null;

// Vercel functions are stateless per cold start, so tables are created lazily
// on first use instead of via a separate migration step.
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS credentials (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          public_key BYTEA NOT NULL,
          counter BIGINT NOT NULL DEFAULT 0,
          device_type TEXT NOT NULL,
          backed_up BOOLEAN NOT NULL DEFAULT false,
          transports TEXT[],
          nickname TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS challenges (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          pending_username TEXT,
          pending_user_id TEXT,
          challenge TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          expires_at TIMESTAMPTZ NOT NULL
        )
      `)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          expires_at TIMESTAMPTZ NOT NULL
        )
      `)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS private_items (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
  }
  return schemaReady;
}
