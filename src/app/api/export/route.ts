import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
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

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Availability");

  sheet.columns = [
    { header: "Child ID", key: "child_id", width: 10 },
    { header: "Child", key: "child_name", width: 20 },
    { header: "Position 1", key: "position_1", width: 15 },
    { header: "Position 2", key: "position_2", width: 15 },
    { header: "Position 3", key: "position_3", width: 15 },
    { header: "Parent", key: "parent_name", width: 15 },
    { header: "Parent Surname", key: "parent_surname", width: 18 },
    { header: "Cell Number", key: "cell_number", width: 18 },
    { header: "Friday Training", key: "friday_training", width: 16 },
    { header: "Game 1", key: "game_1", width: 10 },
    { header: "Game 2", key: "game_2", width: 10 },
    { header: "Game 3", key: "game_3", width: 10 },
    { header: "Position Played", key: "position_played", width: 16 },
    { header: "Tries", key: "tries", width: 10 },
    { header: "Kicks Made", key: "kicks_made", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  // Don't touch this column when filling in match results — it's how
  // the re-uploaded sheet gets matched back to the right child.
  sheet.getColumn("child_id").font = { color: { argb: "FFAAAAAA" } };

  const positionPlayedColNumber = sheet.getColumn("position_played").number;

  let rowIndex = 2; // header is row 1
  for (const row of rows as any[]) {
    sheet.addRow({
      ...row,
      friday_training: row.friday_training ? "Yes" : "No",
      game_1: row.game_1 ? "Yes" : "No",
      game_2: row.game_2 ? "Yes" : "No",
      game_3: row.game_3 ? "Yes" : "No",
      position_played: row.position_played ?? "",
      tries: row.tries ?? 0,
      kicks_made: row.kicks_made ?? 0,
    });

    // Limit "Position Played" to this child's own 3 saved positions,
    // so the coach picks from a dropdown instead of typing freely.
    const positions = [row.position_1, row.position_2, row.position_3].filter(Boolean);
    if (positions.length > 0) {
      sheet.getCell(rowIndex, positionPlayedColNumber).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${positions.join(",")}"`],
      };
    }
    rowIndex++;
  }

  // One worksheet per game that has a saved team sheet.
  for (const gameNumber of [1, 2, 3]) {
    const [teamRows] = await pool.query(
      `SELECT t.jersey_number, t.position, c.name AS child_name
       FROM team_selections t
       LEFT JOIN children c ON c.id = t.child_id
       WHERE t.fixture_id = ? AND t.game_number = ?
       ORDER BY t.jersey_number`,
      [fixtureId, gameNumber]
    );

    if ((teamRows as any[]).length === 0) continue;

    const teamSheet = workbook.addWorksheet(`Team - Game ${gameNumber}`);
    teamSheet.columns = [
      { header: "#", key: "jersey_number", width: 6 },
      { header: "Position", key: "position", width: 20 },
      { header: "Player", key: "child_name", width: 22 },
    ];
    teamSheet.getRow(1).font = { bold: true };

    for (const row of teamRows as any[]) {
      teamSheet.addRow({
        jersey_number: row.jersey_number,
        position: row.position,
        child_name: row.child_name ?? "— unfilled —",
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="availability-fixture-${fixtureId}.xlsx"`,
    },
  });
}
