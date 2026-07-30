import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Submit availability for one child, for one fixture week.
export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { child_id, fixture_id, friday_training, game_1, game_2, game_3 } = await req.json();

  if (!child_id || !fixture_id) {
    return NextResponse.json({ error: "child_id and fixture_id are required." }, { status: 400 });
  }

  // Confirm this child actually belongs to the logged-in parent.
  const [ownedRows] = await pool.query(
    "SELECT id FROM children WHERE id = ? AND parent_id = ?",
    [child_id, user.id]
  );
  if ((ownedRows as any[]).length === 0) {
    return NextResponse.json({ error: "Child not found for this account." }, { status: 403 });
  }

  await pool.query(
    `INSERT INTO availability (child_id, fixture_id, friday_training, game_1, game_2, game_3)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       friday_training = VALUES(friday_training),
       game_1 = VALUES(game_1),
       game_2 = VALUES(game_2),
       game_3 = VALUES(game_3)`,
    [child_id, fixture_id, !!friday_training, !!game_1, !!game_2, !!game_3]
  );

  return NextResponse.json({ success: true });
}

// List availability for the logged-in parent's children for a given fixture.
export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const fixtureId = req.nextUrl.searchParams.get("fixture_id");
  if (!fixtureId) {
    return NextResponse.json({ error: "fixture_id query param is required." }, { status: 400 });
  }

  const [rows] = await pool.query(
    `SELECT c.id AS child_id, c.name, a.friday_training, a.game_1, a.game_2, a.game_3
     FROM children c
     LEFT JOIN availability a ON a.child_id = c.id AND a.fixture_id = ?
     WHERE c.parent_id = ?`,
    [fixtureId, user.id]
  );

  return NextResponse.json({ availability: rows });
}
