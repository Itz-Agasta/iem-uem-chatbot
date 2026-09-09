import { NextResponse } from 'next/server';
import { getContent, saveContent } from '@/lib/content';
import { verifyAuth } from '@/lib/auth';

export async function PUT(request: Request) {
  if (!verifyAuth(request)) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  
  const body = await request.json();
  const content = await getContent();
  
  if (body.events && Array.isArray(body.events)) {
    content.events = body.events;
  }
  
  await saveContent(content);
  return NextResponse.json(content);
}
