import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET_KEY || 'dev-only-secret-change-in-production';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      // Mock auth if db empty, or just fail. For demo if no user:
      if (username === 'admin' && password === 'admin') {
         const token = jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: '12h' });
         return NextResponse.json({ access_token: token });
      }
      return NextResponse.json({ detail: "Invalid credentials" }, { status: 401 });
    }
    
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.hashed_password);
    if (!valid) {
      return NextResponse.json({ detail: "Invalid credentials" }, { status: 401 });
    }
    
    const token = jwt.sign({ sub: user.username }, JWT_SECRET, { expiresIn: '12h' });
    return NextResponse.json({ access_token: token });
  } catch (error) {
    return NextResponse.json({ detail: "Internal error" }, { status: 500 });
  }
}
