import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { userCanAccessChild } from "@/lib/household-access";

// Merges two child records that turned out to be duplicates of the same
// real kid — typically because two parents each independently signed up
// and added "their" child before realizing the other had already added
// the same one, and later linked their households together. keep_id
// survives; remove_id's history is folded into it and then deleted.
export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { keep_id, remove_id } = await req.json();
  if (!keep_id || !remove_id) {
    return NextResponse.json({ error: "keep_id and remove_id are required." }, { status: 400 });
  }
  if (keep_id === remove_id) {
    return NextResponse.json({ error: "Choose two different children to merge." }, { status: 400 });
  }

  const [canKeep, canRemove] = await Promise.all([
    userCanAccessChild(user.id, keep_id),
    userCanAccessChild(user.id, remove_id),
  ]);
  if (!canKeep || !canRemove) {
    return NextResponse.json(
      { error: "You need access to both children to merge them." },
      { status: 403 }
    );
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // availability and game_stats are unique per (child_id, fixture_id).
    // Bring over any fixture the surviving child doesn't already have a
    // row for; whatever's left on the removed child (genuine overlaps)
    // is simply dropped in favor of the surviving child's own data when
    // it's deleted below.
    await conn.query(
      `UPDATE availability SET child_id = ?
       WHERE child_id = ? AND fixture_id NOT IN (
         SELECT fixture_id FROM (SELECT fixture_id FROM availability WHERE child_id = ?) AS existing
       )`,
      [keep_id, remove_id, keep_id]
    );
    await conn.query(
      `UPDATE game_stats SET child_id = ?
       WHERE child_id = ? AND fixture_id NOT IN (
         SELECT fixture_id FROM (SELECT fixture_id FROM game_stats WHERE child_id = ?) AS existing
       )`,
      [keep_id, remove_id, keep_id]
    );

    // Team sheet slots aren't uniquely keyed by child, so just repoint
    // them — do this before deleting, or the FK's ON DELETE SET NULL
    // would clear these slots instead of preserving the selection.
    await conn.query("UPDATE team_selections SET child_id = ? WHERE child_id = ?", [
      keep_id,
      remove_id,
    ]);

    await conn.query("DELETE FROM children WHERE id = ?", [remove_id]);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return NextResponse.json({ success: true });
}
