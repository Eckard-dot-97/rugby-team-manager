import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Remove a parent from a household — either another member removing them,
// or a member removing themselves ("leave household"). Any current member
// can remove any other member, matching invite permissions. The last
// remaining member of a household can't be removed, so a household with
// children never ends up with nobody able to manage them.
export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { household_id, user_id } = await req.json();
  if (!household_id || !user_id) {
    return NextResponse.json({ error: "household_id and user_id are required." }, { status: 400 });
  }

  const [membershipRows] = await pool.query(
    "SELECT user_id FROM household_members WHERE household_id = ?",
    [household_id]
  );
  const memberIds = (membershipRows as any[]).map((r) => r.user_id);

  if (!memberIds.includes(user.id)) {
    return NextResponse.json(
      { error: "You're not a member of that household." },
      { status: 403 }
    );
  }
  if (!memberIds.includes(user_id)) {
    return NextResponse.json({ error: "That parent isn't a member of this household." }, { status: 404 });
  }
  if (memberIds.length === 1) {
    return NextResponse.json(
      { error: "Can't remove the last parent from a household. Add someone else first, or remove the children instead." },
      { status: 400 }
    );
  }

  await pool.query(
    "DELETE FROM household_members WHERE household_id = ? AND user_id = ?",
    [household_id, user_id]
  );

  return NextResponse.json({ success: true });
}
