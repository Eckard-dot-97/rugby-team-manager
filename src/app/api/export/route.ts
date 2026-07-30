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
       g.tries, g.kicks_made
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
    { header: "Tries", key: "tries", width: 10 },
    { header: "Kicks Made", key: "kicks_made", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  // Don't touch this column when filling in match results — it's how
  // the re-uploaded sheet gets matched back to the right child.
  sheet.getColumn("child_id").font = { color: { argb: "FFAAAAAA" } };

  for (const row of rows as any[]) {
    sheet.addRow({
      ...row,
      friday_training: row.friday_training ? "Yes" : "No",
      game_1: row.game_1 ? "Yes" : "No",
      game_2: row.game_2 ? "Yes" : "No",
      game_3: row.game_3 ? "Yes" : "No",
      tries: row.tries ?? 0,
      kicks_made: row.kicks_made ?? 0,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="availability-fixture-${fixtureId}.xlsx"`,
    },
  });
}
