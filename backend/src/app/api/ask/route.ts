import { NextResponse } from 'next/server';
import { generateText, tool, isStepCount } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { pipeline, env } from '@huggingface/transformers';
import { pool } from '@/lib/db';
import { z } from 'zod';

env.allowLocalModels = false;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "dummy",
  extraBody: {
    max_tokens: 1000
  }
});

// cache this - reloading the model on every call was adding ~20-30s per /ask
let extractorPromise: ReturnType<typeof pipeline<'feature-extraction'>> | null = null;
function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractorPromise;
}

export async function POST(request: Request) {
  try {
    const { question } = await request.json();
    if (!question) return NextResponse.json({ detail: "No question provided" }, { status: 400 });

    const { text } = await generateText({
      model: openrouter('nvidia/nemotron-3.5-lightning:free'),
      system: `You are the official IEM-UEM information assistant. Use the 'search_knowledge_base' tool to find relevant information before answering any questions about IEM/UEM. Do not use outside knowledge.`,
      prompt: question,
      stopWhen: isStepCount(5),
      tools: {
        search_knowledge_base: tool({
          description: 'Search the knowledge base for relevant chunks of information to answer the user query.',
          parameters: z.object({
            query: z.string().describe('The search query to look up in the knowledge base'),
          }),
          // @ts-ignore
          execute: async ({ query }: { query: string }) => {
            const extractor = await getExtractor();
            const output = await extractor(query, { pooling: 'mean', normalize: true });
            const embedding = Array.from(output.data);

            const client = await pool.connect();
            let relevantChunks: string[] = [];
            try {
              const result = await client.query(`
                SELECT content, 1 - (embedding <=> $1::vector) as similarity
                FROM document_chunks
                ORDER BY embedding <=> $1::vector
                LIMIT 5
              `, [JSON.stringify(embedding)]);

              relevantChunks = result.rows
                .filter(r => r.similarity > 0.1)
                .map(r => r.content);
            } finally {
              client.release();
            }

            if (relevantChunks.length === 0) {
              return "No relevant information found in the knowledge base.";
            }

            return relevantChunks.join('\n\n---\n\n');
          }
        }),
      },
    });

    return NextResponse.json({ answer: text });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
