import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { buildTeamSlots } from "@/lib/teamBuilder";
import { POSITIONS } from "@/lib/positions";

const GAME_COLUMNS: Record<string, string> = { "1": "game_1", "2": "game_2", "3": "game_3" };

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== "coach") {
    return NextResponse.json({ error: "Coach access only." }, { status: 403 });
  }

  const fixtureId = req.nextUrl.searchParams.get("fixture_id");
  const gameNumber = req.nextUrl.searchParams.get("game_number");

  if (!fixtureId || !gameNumber || !GAME_COLUMNS[gameNumber]) {
    return NextResponse.json({ error: "fixture_id and a valid game_number (1, 2, or 3) are required." }, { status: 400 });
  }
  const gameColumn = GAME_COLUMNS[gameNumber];

  // Every child, with their 3 positions and per-game availability for this fixture —
  // used for the "squad by position" grouping view.
  const [squadRows] = await pool.query(
    `SELECT c.id AS child_id, c.name, c.position_1, c.position_2, c.position_3,
            a.game_1, a.game_2, a.game_3
     FROM children c
     LEFT JOIN availability a ON a.child_id = c.id AND a.fixture_id = ?
     ORDER BY c.name`,
    [fixtureId]
  );

  const squadByPosition = POSITIONS.map((position) => ({
    position,
    children: (squadRows as any[])
      .filter((c) => [c.position_1, c.position_2, c.position_3].includes(position))
      .map((c) => ({
        child_id: c.child_id,
        name: c.name,
        game_1: c.game_1,
        game_2: c.game_2,
        game_3: c.game_3,
      })),
  }));

  // Children available for this specific game — candidates for the dropdown.
  const availableChildren = (squadRows as any[])
    .filter((c) => c[gameColumn])
    .map((c) => ({
      child_id: c.child_id,
      name: c.name,
      positions: [c.position_1, c.position_2, c.position_3],
    }));

  // Current saved team sheet for this fixture/game, if any.
  const [savedRows] = await pool.query(
    `SELECT t.jersey_number, t.position, t.child_id, c.name AS child_name
     FROM team_selections t
     LEFT JOIN children c ON c.id = t.child_id
     WHERE t.fixture_id = ? AND t.game_number = ?
     ORDER BY t.jersey_number`,
    [fixtureId, gameNumber]
  );

  const savedByJersey = new Map((savedRows as any[]).map((r) => [r.jersey_number, r]));
  const slots = buildTeamSlots().map((slot) => {
    const saved = savedByJersey.get(slot.jerseyNumber);
    return {
      jersey_number: slot.jerseyNumber,
      position: slot.position,
      child_id: saved?.child_id ?? null,
      child_name: saved?.child_name ?? null,
    };
  });

  return NextResponse.json({ slots, available_children: availableChildren, squad_by_position: squadByPosition });
}

export async function PUT(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== "coach") {
    return NextResponse.json({ error: "Coach access only." }, { status: 403 });
  }

  const { fixture_id, game_number, assignments } = await req.json();

  if (!fixture_id || !game_number || !Array.isArray(assignments)) {
    return NextResponse.json({ error: "fixture_id, game_number, and assignments are required." }, { status: 400 });
  }

  const slots = buildTeamSlots();
  const slotByJersey = new Map(slots.map((s) => [s.jerseyNumber, s]));

  for (const a of assignments) {
    const slot = slotByJersey.get(a.jersey_number);
    if (!slot) continue;

    await pool.query(
      `INSERT INTO team_selections (fixture_id, game_number, jersey_number, position, child_id)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE child_id = VALUES(child_id)`,
      [fixture_id, game_number, slot.jerseyNumber, slot.position, a.child_id ?? null]
    );
  }

  return NextResponse.json({ success: true });
}
