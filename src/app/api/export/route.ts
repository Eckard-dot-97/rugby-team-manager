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

  // Club-level defaults and this fixture's match-specific details.
  const [clubRows] = await pool.query("SELECT * FROM club_settings WHERE id = 1");
  const club = (clubRows as any[])[0] || {};

  const [fixtureRows] = await pool.query("SELECT * FROM fixtures WHERE id = ?", [fixtureId]);
  const fixture = (fixtureRows as any[])[0] || {};

  const weekDate = fixture.week_date ? new Date(fixture.week_date) : null;
  const dateLabel = weekDate ? weekDate.toLocaleDateString() : "";

  const RESERVE_LABELS = [
    "HOOKER", "PROP", "PROP",
    "UTILITY FORWARD/BACK", "UTILITY FORWARD/BACK", "UTILITY FORWARD/BACK",
    "UTILITY FORWARD/BACK", "UTILITY FORWARD/BACK", "UTILITY FORWARD/BACK",
    "UTILITY FORWARD/BACK",
  ];

  // One worksheet per game that has a saved team sheet, laid out to match
  // the club's official match-day team sheet template.
  for (const gameNumber of [1, 2, 3]) {
    const [teamRows] = await pool.query(
      `SELECT t.jersey_number, t.position, t.child_id, c.name AS child_name
       FROM team_selections t
       LEFT JOIN children c ON c.id = t.child_id
       WHERE t.fixture_id = ? AND t.game_number = ?
       ORDER BY t.jersey_number DESC`,
      [fixtureId, gameNumber]
    );

    if ((teamRows as any[]).length === 0) continue;

    const ts = workbook.addWorksheet(`Team - Game ${gameNumber}`);
    ts.columns = [
      { width: 22 }, { width: 12 }, { width: 8 }, { width: 16 },
      { width: 10 }, { width: 20 }, { width: 22 }, { width: 16 },
    ];

    const bold = { bold: true };
    let r = 1;

    ts.mergeCells(`E${r}:F${r}`);
    ts.getCell(`E${r}`).value = "TEAM SHEET";
    ts.getCell(`E${r}`).font = { bold: true, size: 14 };
    r += 2;

    ts.getCell(`A${r}`).value = club.club_name || "";
    ts.getCell(`A${r}`).font = bold;
    r += 2;

    ts.mergeCells(`A${r}:H${r}`);
    ts.getCell(`A${r}`).value =
      "This team list must be completed by the Team Manager and handed to the match day organizer at the technical table at least 30 minutes before kick-off — 4 copies needed (table, referee, opposition, yours). Opposition must submit the same.";
    ts.getCell(`A${r}`).alignment = { wrapText: true };
    r += 2;

    const row = (label1: string, val1: string, label2?: string, val2?: string) => {
      ts.getCell(`A${r}`).value = label1;
      ts.getCell(`A${r}`).font = bold;
      ts.getCell(`D${r}`).value = val1 || "";
      if (label2) {
        ts.getCell(`F${r}`).value = label2;
        ts.getCell(`F${r}`).font = bold;
        ts.getCell(`H${r}`).value = val2 || "";
      }
      r++;
    };

    row("COMPETITION", fixture.competition, "OPPONENT", fixture.opponent);
    row("TEAM/AGE GROUP", club.team_age_group);
    row("COACH 1 NAME", club.coach_1_name, "COACH 2 NAME", club.coach_2_name);
    row("COACH 3 NAME", club.coach_3_name, "TEAM MANAGER NAME", club.team_manager_name);
    row("TEAM MANAGER EMAIL", club.team_manager_email, "TEAM MANAGER CELL NO", club.team_manager_cell);
    row("Boksmart (BS) NO. COACH 1", club.coach_1_bs_no, "Boksmart (BS) NO. COACH 2", club.coach_2_bs_no);
    row("Boksmart (BS) NO. COACH 3", club.coach_3_bs_no, "Boksmart (BS) No. MANAGER", club.team_manager_bs_no);
    row("MATCH REFEREE NAME", fixture.referee_name, "Boksmart (BS) No. REFEREE", fixture.referee_bs_no);
    row("VENUE", fixture.venue);
    row("DAY", "SATURDAY", "TIME", fixture.kickoff_time);
    ts.getCell(`F${r - 1}`).value = "DATE";
    ts.getCell(`F${r - 1}`).font = bold;
    ts.getCell(`H${r - 1}`).value = dateLabel;
    r++;

    const headerRow = r;
    ["TEAM SHEET", "", "", "SURNAME", "INITIALS", "NAME", "SCHOOL", "DATE OF BIRTH"].forEach((h, i) => {
      const cell = ts.getCell(headerRow, i + 1);
      cell.value = h;
      cell.font = bold;
    });
    r += 2;

    for (const tr of teamRows as any[]) {
      ts.getCell(r, 1).value = tr.jersey_number;
      ts.getCell(r, 2).value = tr.position.toUpperCase();
      ts.getCell(r, 3).value = tr.child_id ?? "";
      ts.getCell(r, 6).value = tr.child_name ?? "";
      // SURNAME, INITIALS, SCHOOL, DATE OF BIRTH left blank — not currently
      // captured by the app, fill in by hand if needed.
      r++;
    }
    r++;

    ts.getCell(`A${r}`).value = "RESERVES";
    ts.getCell(`A${r}`).font = bold;
    r++;

    RESERVE_LABELS.forEach((label, i) => {
      ts.getCell(r, 1).value = 16 + i;
      ts.getCell(r, 2).value = label;
      r++;
    });
    r += 2;

    ts.mergeCells(`A${r}:H${r}`);
    ts.getCell(`A${r}`).value = "I HEREBY CONFIRM THE INFORMATION ON THIS TEAM SHEET IS CORRECT";
    r += 2;

    ts.getCell(`A${r}`).value = "TEAM MANAGER";
    ts.getCell(`A${r}`).font = bold;
    ts.getCell(`C${r}`).value = club.team_manager_name || "";
    r++;
    ts.getCell(`A${r}`).value = "DATE";
    ts.getCell(`A${r}`).font = bold;
    ts.getCell(`C${r}`).value = dateLabel;
    ts.getCell(`E${r}`).value = "SIGNATURE: ______________________________";
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="availability-fixture-${fixtureId}.xlsx"`,
    },
  });
}
