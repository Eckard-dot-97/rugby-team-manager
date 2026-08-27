import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "Missing invite token." }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const [inviteRows] = await pool.query(
    `SELECT i.id, i.household_id, i.invited_email, i.status, i.expires_at, h.name AS household_name
     FROM household_invites i
     JOIN households h ON h.id = i.household_id
     WHERE i.token_hash = ?`,
    [tokenHash]
  );
  const invite = (inviteRows as any[])[0];

  if (!invite || invite.status !== "pending" || new Date(invite.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "This invite link is invalid, has expired, or was already used." },
      { status: 400 }
    );
  }

  const user = getSessionUser(req);

  if (!user) {
    // Not logged in yet — let the front-end route them to sign up or log
    // in as the invited email, then come back with the same token.
    return NextResponse.json({
      requires_auth: true,
      invited_email: invite.invited_email,
    });
  }

  if (user.email.toLowerCase() !== invite.invited_email.toLowerCase()) {
    return NextResponse.json(
      {
        error: `This invite was sent to ${invite.invited_email}. Log in with that email to accept it.`,
        invited_email: invite.invited_email,
      },
      { status: 403 }
    );
  }

  await pool.query(
    "INSERT IGNORE INTO household_members (household_id, user_id) VALUES (?, ?)",
    [invite.household_id, user.id]
  );
  await pool.query(
    "UPDATE household_invites SET status = 'accepted', accepted_at = NOW() WHERE id = ?",
    [invite.id]
  );

  const [children] = await pool.query(
    "SELECT name FROM children WHERE household_id = ?",
    [invite.household_id]
  );

  return NextResponse.json({
    success: true,
    household_name: invite.household_name || "Household",
    children: (children as any[]).map((c) => c.name),
  });
}
