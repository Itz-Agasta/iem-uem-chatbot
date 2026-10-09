import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: Request) {
  const user = verifyAuth(request);
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ detail: "Username and password are required" }, { status: 400 });
    }

    const hashed_password = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO admin_users (username, hashed_password) VALUES ($1, $2)',
      [username, hashed_password]
    );

    return NextResponse.json({ success: true, message: "User added successfully" });
  } catch (error: any) {
    if (error.code === '23505') { // Postgres unique violation
      return NextResponse.json({ detail: "Username already exists" }, { status: 400 });
    }
    console.error("Error creating user:", error);
    return NextResponse.json({ detail: "Internal error" }, { status: 500 });
  }
}
