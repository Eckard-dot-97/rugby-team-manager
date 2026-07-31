import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== "coach") {
    return NextResponse.json({ error: "Coach access only." }, { status: 403 });
  }

  const fixtureId = req.nextUrl.searchParams.get("fixture_id");
  if (!fixtureId) {
    return NextResponse.json({ error: "fixture_id query param is required." }, { status: 400 });
  }

  const [rows] = await pool.query(
    `SELECT
       c.id AS child_id,
       c.name AS child_name,
       c.position_1, c.position_2, c.position_3,
       u.name AS parent_name, u.surname AS parent_surname, u.cell_number,
       a.friday_training, a.game_1, a.game_2, a.game_3,
       g.position_played, g.tries, g.kicks_made
     FROM children c
     JOIN users u ON u.id = c.parent_id
     LEFT JOIN availability a ON a.child_id = c.id AND a.fixture_id = ?
     LEFT JOIN game_stats g ON g.child_id = c.id AND g.fixture_id = ?
     ORDER BY c.name`,
    [fixtureId, fixtureId]
  );

  return NextResponse.json({ roster: rows });
}
