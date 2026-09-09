import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://iem_uem:iem_uem_password@localhost:5432/iem_uem_kiosk"
});

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        hashed_password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        metadata JSONB,
        embedding vector(384)
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS kiosk_content (
        id INT PRIMARY KEY DEFAULT 1,
        data JSONB NOT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS uploaded_images (
        id VARCHAR(255) PRIMARY KEY,
        mime_type VARCHAR(100) NOT NULL,
        data BYTEA NOT NULL
      );
    `);
  } finally {
    client.release();
  }
}
