import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { sendHouseholdInviteEmail } from "@/lib/mailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Any current member of a household can invite another parent to join it
// (e.g. a mom or dad adding a step-parent).
export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { household_id, email } = await req.json();

  if (!household_id || !email) {
    return NextResponse.json({ error: "household_id and email are required." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const [membershipRows] = await pool.query(
    "SELECT h.id, h.name FROM households h JOIN household_members hm ON hm.household_id = h.id WHERE h.id = ? AND hm.user_id = ?",
    [household_id, user.id]
  );
  const household = (membershipRows as any[])[0];
  if (!household) {
    return NextResponse.json(
      { error: "You're not a member of that household." },
      { status: 403 }
    );
  }

  // If this email already belongs to a member of the household, nothing to do.
  const [alreadyMemberRows] = await pool.query(
    `SELECT hm.id FROM household_members hm
     JOIN users u ON u.id = hm.user_id
     WHERE hm.household_id = ? AND u.email = ?`,
    [household_id, email]
  );
  if ((alreadyMemberRows as any[]).length > 0) {
    return NextResponse.json(
      { error: "That email is already a member of this household." },
      { status: 409 }
    );
  }

  const [[inviter]] = (await pool.query("SELECT name, surname FROM users WHERE id = ?", [
    user.id,
  ])) as any[];
  const inviterName = inviter ? `${inviter.name} ${inviter.surname}` : "A parent";

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Superseding any earlier still-pending invite to the same email for this
  // household keeps things tidy if someone re-sends an invite.
  await pool.query(
    `UPDATE household_invites SET status = 'revoked'
     WHERE household_id = ? AND invited_email = ? AND status = 'pending'`,
    [household_id, email]
  );

  await pool.query(
    `INSERT INTO household_invites (household_id, invited_email, invited_by, token_hash, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [household_id, email, user.id, tokenHash, expires]
  );

  const appUrl = process.env.APP_URL || req.nextUrl.origin;
  const acceptUrl = `${appUrl}/household/accept?token=${token}`;

  try {
    await sendHouseholdInviteEmail(email, inviterName, household.name || "the household", acceptUrl);
  } catch (err) {
    console.error("Failed to send household invite email:", err);
    return NextResponse.json(
      { error: "Invite was created but the email couldn't be sent. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
