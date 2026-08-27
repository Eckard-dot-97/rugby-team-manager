import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { userCanAccessChild } from "@/lib/household-access";

// Deletes a child outright. availability/game_stats rows cascade-delete
// automatically (ON DELETE CASCADE); any team_selections slot pointing at
// this child is automatically cleared to NULL (ON DELETE SET NULL) rather
// than breaking the fixture's team sheet.
export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { child_id } = await req.json();
  if (!child_id) {
    return NextResponse.json({ error: "child_id is required." }, { status: 400 });
  }

  if (!(await userCanAccessChild(user.id, child_id))) {
    return NextResponse.json({ error: "Child not found for this account." }, { status: 403 });
  }

  await pool.query("DELETE FROM children WHERE id = ?", [child_id]);

  return NextResponse.json({ success: true });
}
