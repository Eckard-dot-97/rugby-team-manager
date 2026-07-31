import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password, expected_role } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const [rows] = await pool.query(
    "SELECT id, email, password_hash, role FROM users WHERE email = ?",
    [email]
  );
  const user = (rows as any[])[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (expected_role && user.role !== expected_role) {
    const message =
      expected_role === "coach"
        ? "This account isn't set up as a coach. Use parent login instead."
        : "This is a coach account. Use coach login instead.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });

  const response = NextResponse.json({ success: true, role: user.role });
  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
