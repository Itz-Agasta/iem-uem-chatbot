import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { pool } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { pipeline, env } from '@huggingface/transformers';

// Disable downloading models in some contexts if needed, but here we want it to download
env.allowLocalModels = false;

// Chunking utility
function chunkText(text: string, maxLen: number = 1000): string[] {
  // Simple chunking by double newlines then length
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

export async function POST(request: Request) {
  if (!verifyAuth(request)) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  
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
    return NextResponse.json({ status: "success", chunk_count: 0 });
  }

  // Load embedding model
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM document_chunks');
    
    for (const chunk of allChunks) {
      const output = await extractor(chunk, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data);
      
      await client.query(
        'INSERT INTO document_chunks (content, embedding) VALUES ($1, $2::vector)',
        [chunk, JSON.stringify(embedding)]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return NextResponse.json({ detail: "Failed to index" }, { status: 500 });
  } finally {
    client.release();
  }

  return NextResponse.json({ status: "success", chunk_count: allChunks.length });
}
