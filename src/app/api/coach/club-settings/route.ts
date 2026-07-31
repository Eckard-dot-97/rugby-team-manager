import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== "coach") {
    return NextResponse.json({ error: "Coach access only." }, { status: 403 });
  }

  const [rows] = await pool.query("SELECT * FROM club_settings WHERE id = 1");
  const settings = (rows as any[])[0] || null;

  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== "coach") {
    return NextResponse.json({ error: "Coach access only." }, { status: 403 });
  }

  const body = await req.json();
  const fields = [
    "club_name",
    "team_age_group",
    "coach_1_name",
    "coach_1_bs_no",
    "coach_2_name",
    "coach_2_bs_no",
    "coach_3_name",
    "coach_3_bs_no",
    "team_manager_name",
    "team_manager_email",
    "team_manager_cell",
    "team_manager_bs_no",
  ];
  const values = fields.map((f) => body[f] || null);

  await pool.query(
    `INSERT INTO club_settings (id, ${fields.join(", ")})
     VALUES (1, ${fields.map(() => "?").join(", ")})
     ON DUPLICATE KEY UPDATE ${fields.map((f) => `${f} = VALUES(${f})`).join(", ")}`,
    values
  );

  return NextResponse.json({ success: true });
}
