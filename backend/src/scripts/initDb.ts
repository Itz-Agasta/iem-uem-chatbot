import { initDb, pool } from '../lib/db';
import bcrypt from 'bcryptjs';

async function run() {
  await initDb();
  const password = await bcrypt.hash('admin', 10);
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO admin_users (username, hashed_password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
      ['admin', password]
    );

    // Seed existing content.json into DB
    try {
      const fs = require('fs/promises');
      const path = require('path');
      const dataStr = await fs.readFile(path.join(process.cwd(), 'data', 'content.json'), 'utf-8');
      const data = JSON.parse(dataStr);
      await client.query(
        'INSERT INTO kiosk_content (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING',
        [data]
      );
      console.log('Migrated content.json to database');
    } catch (e) {
      // Ignore if file doesn't exist
    }

    console.log('Database initialized');
  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
