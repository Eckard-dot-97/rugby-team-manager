import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const [rows] = await pool.query(
    `SELECT id, week_date, game_1_label, game_2_label, game_3_label
     FROM fixtures
     ORDER BY week_date DESC`
  );

  return NextResponse.json({ fixtures: rows });
}
