import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Cancel a still-pending invite (e.g. it was sent to the wrong address).
// Any member of the household it belongs to can revoke it.
export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { invite_id } = await req.json();
  if (!invite_id) {
    return NextResponse.json({ error: "invite_id is required." }, { status: 400 });
  }

  const [rows] = await pool.query(
    `SELECT i.id FROM household_invites i
     JOIN household_members hm ON hm.household_id = i.household_id
     WHERE i.id = ? AND hm.user_id = ? AND i.status = 'pending'`,
    [invite_id, user.id]
  );
  if ((rows as any[]).length === 0) {
    return NextResponse.json(
      { error: "Invite not found, already resolved, or not visible to you." },
      { status: 404 }
    );
  }

  await pool.query("UPDATE household_invites SET status = 'revoked' WHERE id = ?", [invite_id]);

  return NextResponse.json({ success: true });
}
