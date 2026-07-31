import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { buildTeamSlots, assignTeam, type CandidateChild } from "@/lib/teamBuilder";
import type { Position } from "@/lib/positions";

const GAME_COLUMNS: Record<string, string> = { "1": "game_1", "2": "game_2", "3": "game_3" };

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== "coach") {
    return NextResponse.json({ error: "Coach access only." }, { status: 403 });
  }

  const { fixture_id, game_number } = await req.json();

  if (!fixture_id || !game_number || !GAME_COLUMNS[String(game_number)]) {
    return NextResponse.json({ error: "fixture_id and a valid game_number (1, 2, or 3) are required." }, { status: 400 });
  }
  const gameColumn = GAME_COLUMNS[String(game_number)];

  // Children available for this game, with their 3 preferred positions.
  const [available] = await pool.query(
    `SELECT c.id AS child_id, c.name, c.position_1, c.position_2, c.position_3
     FROM children c
     JOIN availability a ON a.child_id = c.id AND a.fixture_id = ?
     WHERE a.${gameColumn} = TRUE`,
    [fixture_id]
  );

  // Positions each child already played in the OTHER games this Saturday,
  // so we can avoid repeating a position across Games 1/2/3.
  const [alreadyPlayed] = await pool.query(
    `SELECT child_id, position
     FROM team_selections
     WHERE fixture_id = ? AND game_number != ? AND child_id IS NOT NULL`,
    [fixture_id, game_number]
  );
  const playedByChild = new Map<number, Set<string>>();
  for (const row of alreadyPlayed as any[]) {
    if (!playedByChild.has(row.child_id)) playedByChild.set(row.child_id, new Set());
    playedByChild.get(row.child_id)!.add(row.position);
  }

  const candidates: CandidateChild[] = (available as any[]).map((c) => {
    const allPositions = [c.position_1, c.position_2, c.position_3] as Position[];
    const played = playedByChild.get(c.child_id);
    const notYetPlayed = played ? allPositions.filter((p) => !played.has(p)) : allPositions;
    // Prefer positions they haven't played yet this Saturday; if they've
    // already covered all 3, fall back to their full list rather than
    // benching them entirely.
    return {
      childId: c.child_id,
      name: c.name,
      eligiblePositions: notYetPlayed.length > 0 ? notYetPlayed : allPositions,
    };
  });

  const slots = buildTeamSlots();
  const assignment = assignTeam(slots, candidates);

  // Replace any existing selections for this fixture/game with the fresh result.
  await pool.query("DELETE FROM team_selections WHERE fixture_id = ? AND game_number = ?", [fixture_id, game_number]);

  for (const slot of slots) {
    const childId = assignment.get(slot.jerseyNumber) ?? null;
    await pool.query(
      `INSERT INTO team_selections (fixture_id, game_number, jersey_number, position, child_id)
       VALUES (?, ?, ?, ?, ?)`,
      [fixture_id, game_number, slot.jerseyNumber, slot.position, childId]
    );
  }

  const filled = Array.from(assignment.values()).length;
  return NextResponse.json({ success: true, filled, total: slots.length });
}
