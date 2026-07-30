import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ error: "Token and new password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const [rows] = await pool.query(
    "SELECT id, reset_token_expires FROM users WHERE reset_token_hash = ?",
    [tokenHash]
  );
  const user = (rows as any[])[0];

  if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 10);
  await pool.query(
    "UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?",
    [password_hash, user.id]
  );

  return NextResponse.json({ success: true });
}
