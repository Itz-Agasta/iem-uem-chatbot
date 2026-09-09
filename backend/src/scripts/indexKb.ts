import module from 'module';
const originalRequire = module.createRequire(import.meta.url);
// @ts-ignore
module.createRequire = (url: string | URL) => {
  const req = originalRequire(url.toString());
  return (path: string) => {
    if (path === 'canvas') return {};
    return req(path);
  };
};

import { pool } from '../lib/db';
import fs from 'fs/promises';
import path from 'path';
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

function chunkText(text: string, maxLen: number = 1000): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = "";
  
  for (const p of paragraphs) {
    if ((currentChunk.length + p.length) > maxLen && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = p;
    } else {
      currentChunk += (currentChunk.length > 0 ? "\n\n" : "") + p;
    }
  }
  if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
  return chunks;
}

async function run() {
  const kbDir = path.join(process.cwd(), 'knowledge_base');
  await fs.mkdir(kbDir, { recursive: true });
  
  const files = await fs.readdir(kbDir);
  const mdFiles = files.filter(f => f.endsWith('.md'));
  
  const allChunks: string[] = [];
  
  for (const file of mdFiles) {
    const content = await fs.readFile(path.join(kbDir, file), 'utf-8');
    const chunks = chunkText(content);
    allChunks.push(...chunks);
  }
  
  if (allChunks.length === 0) {
    console.log("No chunks found.");
    process.exit(0);
  }

  console.log(`Found ${allChunks.length} chunks. Indexing...`);
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM document_chunks');
    
    for (let i = 0; i < allChunks.length; i++) {
      const chunk = allChunks[i];
      const output = await extractor(chunk, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data);
      
      await client.query(
        'INSERT INTO document_chunks (content, embedding) VALUES ($1, $2::vector)',
        [chunk, JSON.stringify(embedding)]
      );
      if ((i + 1) % 10 === 0) console.log(`Indexed ${i + 1}/${allChunks.length} chunks...`);
    }
    await client.query('COMMIT');
    console.log(`Successfully indexed ${allChunks.length} chunks.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Failed to index:", err);
  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
