import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password, name, surname, cell_number } = await req.json();

  if (!email || !password || !name || !surname || !cell_number) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const [existing] = await pool.query(
    "SELECT id FROM users WHERE email = ?",
    [email]
  );
  if ((existing as any[]).length > 0) {
    return NextResponse.json({ error: "Email already registered." }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, name, surname, cell_number, role)
     VALUES (?, ?, ?, ?, ?, 'parent')`,
    [email, password_hash, name, surname, cell_number]
  );

  const userId = (result as any).insertId;
  const token = signToken({ id: userId, email, role: "parent" });

  const response = NextResponse.json({ success: true });
  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
