import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== "coach") {
    return NextResponse.json({ error: "Coach access only." }, { status: 403 });
  }

  const { week_date, game_1_label, game_2_label, game_3_label } = await req.json();

  if (!week_date) {
    return NextResponse.json({ error: "week_date is required." }, { status: 400 });
  }

  const [result] = await pool.query(
    `INSERT INTO fixtures (week_date, game_1_label, game_2_label, game_3_label)
     VALUES (?, ?, ?, ?)`,
    [
      week_date,
      game_1_label || "Game 1",
      game_2_label || "Game 2",
      game_3_label || "Game 3",
    ]
  );

  return NextResponse.json({ success: true, id: (result as any).insertId });
}

export async function PUT(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== "coach") {
    return NextResponse.json({ error: "Coach access only." }, { status: 403 });
  }

  const { id, competition, opponent, venue, kickoff_time, referee_name, referee_bs_no } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Fixture id is required." }, { status: 400 });
  }

  await pool.query(
    `UPDATE fixtures
     SET competition = ?, opponent = ?, venue = ?, kickoff_time = ?, referee_name = ?, referee_bs_no = ?
     WHERE id = ?`,
    [competition || null, opponent || null, venue || null, kickoff_time || null, referee_name || null, referee_bs_no || null, id]
  );

  return NextResponse.json({ success: true });
}
