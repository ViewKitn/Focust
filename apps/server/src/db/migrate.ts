import { pool } from './index';
import { readFileSync } from 'node:fs';
import path from 'node:path';

async function runMigrate() {
  console.log('Running migrations...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(readFileSync(path.resolve(__dirname, '../migrations/0000_init.sql'), 'utf8'));
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS one_live_session_per_user ON focus_sessions(user_id) WHERE status = 'focusing';
      CREATE INDEX IF NOT EXISTS sessions_user_created ON focus_sessions(user_id, created_at DESC);`);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); await pool.end(); }
  console.log('Migrations complete!');
  process.exit(0);
}

runMigrate().catch((err) => {
  console.error('Migration failed!', err);
  process.exit(1);
});
