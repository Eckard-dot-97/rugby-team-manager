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
  "SELECT id, email, password_hash, role, is_coach FROM users WHERE email = ?",
  [email]
);
  const user = (rows as any[])[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

if (expected_role === "coach" && !user.is_coach) {
  return NextResponse.json(
    { error: "This account isn't set up as a coach. Use parent login instead." },
    { status: 403 }
  );
}

  const sessionRole =
  expected_role === "coach" ? "coach" : "parent";

  const token = signToken({
    id: user.id,
    email: user.email,
    role: sessionRole,
  });
const response = NextResponse.json({
  success: true,
  role: sessionRole,
});
  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
