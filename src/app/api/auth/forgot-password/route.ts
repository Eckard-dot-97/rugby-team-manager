import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  const user = (rows as any[])[0];

  // Always respond the same way whether or not the email exists,
  // so this endpoint can't be used to check who's registered.
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      "UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?",
      [tokenHash, expires, user.id]
    );

    const appUrl = process.env.APP_URL || req.nextUrl.origin;
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }
  }

  return NextResponse.json({
    success: true,
    message: "If that email is registered, a reset link has been sent.",
  });
}
