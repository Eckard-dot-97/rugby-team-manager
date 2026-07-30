import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { calculatePoints } from "@/lib/scoring";

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const [children] = await pool.query(
    "SELECT id, name FROM children WHERE parent_id = ?",
    [user.id]
  );

  const result = [];

  for (const child of children as any[]) {
    const [totals] = await pool.query(
      `SELECT
         COALESCE(SUM(tries), 0) AS total_tries,
         COALESCE(SUM(kicks_made), 0) AS total_kicks,
         COUNT(*) AS games_with_stats
       FROM game_stats
       WHERE child_id = ?`,
      [child.id]
    );
    const totalsRow = (totals as any[])[0];

    const [history] = await pool.query(
      `SELECT
         f.id AS fixture_id, f.week_date,
         a.friday_training, a.game_1, a.game_2, a.game_3,
         g.tries, g.kicks_made
       FROM fixtures f
       LEFT JOIN availability a ON a.fixture_id = f.id AND a.child_id = ?
       LEFT JOIN game_stats g ON g.fixture_id = f.id AND g.child_id = ?
       ORDER BY f.week_date DESC`,
      [child.id, child.id]
    );

    result.push({
      child_id: child.id,
      name: child.name,
      total_tries: totalsRow.total_tries,
      total_kicks: totalsRow.total_kicks,
      total_points: calculatePoints(totalsRow.total_tries, totalsRow.total_kicks),
      games_with_stats: totalsRow.games_with_stats,
      history,
    });
  }

  return NextResponse.json({ children: result });
}
