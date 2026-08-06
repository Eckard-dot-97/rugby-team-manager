import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { POSITIONS } from "@/lib/positions";

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
 // added date_of_birth and school to the query for the get request
  const [rows] = await pool.query(
    "SELECT id, name, date_of_birth,school, position_1, position_2, position_3 FROM children WHERE parent_id = ?",
    [user.id]
  );
  return NextResponse.json({ children: rows });
}

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  //added date_of_birth and school for when we read the request 
  const { name,date_of_birth, school, position_1, position_2, position_3 } = await req.json();
  // I keep the validation the same as the date_of_birth and school fiels is optional
  if (!name || !position_1 || !position_2 || !position_3) {
    return NextResponse.json({ error: "Name and three positions are required." }, { status: 400 });
  }

  const positions = [position_1, position_2, position_3];
  if (positions.some((p) => !POSITIONS.includes(p))) {
    return NextResponse.json({ error: "Invalid position selected." }, { status: 400 });
  }
  // I added || null incase the user leaves the fields open
  const [result] = await pool.query(
    `INSERT INTO children (parent_id, name, date_of_birth,school, position_1, position_2, position_3)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user.id, name,date_of_birth || null, school || null, position_1, position_2, position_3]
  );

  return NextResponse.json({ success: true, id: (result as any).insertId });
}
