import { db } from './index';
import { users } from './schema';
import * as bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding database...');
  
  const hash = await bcrypt.hash('password123', 10);
  
  await db.insert(users).values([
    {
      email: 'alice@test.com',
      passwordHash: hash,
      nickname: 'Alice',
      avatarPreset: 'preset-1',
    },
    {
      email: 'bob@test.com',
      passwordHash: hash,
      nickname: 'Bob',
      avatarPreset: 'preset-2',
    }
  ]).onConflictDoNothing().execute();
  
  console.log('Test accounts Alice and Bob created.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
