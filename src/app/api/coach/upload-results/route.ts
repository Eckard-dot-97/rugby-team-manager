import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== "coach") {
    return NextResponse.json({ error: "Coach access only." }, { status: 403 });
  }

  const formData = await req.formData();
  const fixtureId = formData.get("fixture_id");
  const file = formData.get("file");

  if (!fixtureId || typeof fixtureId !== "string") {
    return NextResponse.json({ error: "fixture_id is required." }, { status: 400 });
  }
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "An Excel file is required." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    return NextResponse.json({ error: "The uploaded file has no sheets." }, { status: 400 });
  }

  // Map header names to column numbers so we're not relying on fixed positions.
  const headerRow = sheet.getRow(1);
  const columnByHeader: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const header = String(cell.value ?? "").trim().toLowerCase();
    columnByHeader[header] = colNumber;
  });

  const childIdCol = columnByHeader["child id"];
  const positionPlayedCol = columnByHeader["position played"];
  const triesCol = columnByHeader["tries"];
  const kicksCol = columnByHeader["kicks made"];

  if (!childIdCol || !triesCol || !kicksCol) {
    return NextResponse.json(
      { error: "Expected 'Child ID', 'Tries', and 'Kicks Made' columns weren't found. Use the exported sheet as your starting point." },
      { status: 400 }
    );
  }

  let updated = 0;
  const errors: string[] = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const childIdRaw = row.getCell(childIdCol).value;
    if (childIdRaw === null || childIdRaw === undefined || childIdRaw === "") continue;

    const childId = Number(childIdRaw);
    const tries = Number(row.getCell(triesCol).value ?? 0);
    const kicksMade = Number(row.getCell(kicksCol).value ?? 0);
    const positionPlayedRaw = positionPlayedCol ? row.getCell(positionPlayedCol).value : null;
    const positionPlayed = positionPlayedRaw ? String(positionPlayedRaw).trim() : null;

    if (!Number.isInteger(childId) || Number.isNaN(tries) || Number.isNaN(kicksMade)) {
      errors.push(`Row ${rowNumber}: couldn't read child ID, tries, or kicks as numbers.`);
      continue;
    }

    await pool.query(
      `INSERT INTO game_stats (child_id, fixture_id, position_played, tries, kicks_made)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         position_played = VALUES(position_played),
         tries = VALUES(tries),
         kicks_made = VALUES(kicks_made)`,
      [childId, Number(fixtureId), positionPlayed, tries, kicksMade]
    );
    updated++;
  }

  return NextResponse.json({ success: true, updated, errors });
}
