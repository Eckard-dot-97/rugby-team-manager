import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { POSITIONS } from "@/lib/positions";

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  // A child is visible to a parent either through direct legacy ownership
  // (parent_id) or through household membership — any parent sharing the
  // child's household (mom, dad, step-parent, etc.) can see and manage it.
  const [rows] = await pool.query(
    `SELECT DISTINCT c.id, c.name, c.date_of_birth, c.school,
            c.position_1, c.position_2, c.position_3, c.household_id
     FROM children c
     LEFT JOIN household_members hm ON hm.household_id = c.household_id AND hm.user_id = ?
     WHERE hm.user_id IS NOT NULL OR c.parent_id = ?
     ORDER BY c.id`,
    [user.id, user.id]
  );

  const children = rows as any[];

  // Attach the list of co-parents managing each child, so the dashboard
  // can show "Managed by: ..." alongside each child.
  const householdIds = [...new Set(children.map((c) => c.household_id).filter(Boolean))];
  let membersByHousehold = new Map<number, { id: number; name: string; surname: string }[]>();

  if (householdIds.length > 0) {
    const [memberRows] = await pool.query(
      `SELECT hm.household_id, u.id, u.name, u.surname
       FROM household_members hm
       JOIN users u ON u.id = hm.user_id
       WHERE hm.household_id IN (?)`,
      [householdIds]
    );
    for (const row of memberRows as any[]) {
      const list = membersByHousehold.get(row.household_id) || [];
      list.push({ id: row.id, name: row.name, surname: row.surname });
      membersByHousehold.set(row.household_id, list);
    }
  }

  const enriched = children.map((c) => ({
    ...c,
    co_parents: c.household_id ? membersByHousehold.get(c.household_id) || [] : [],
  }));

  return NextResponse.json({ children: enriched });
}

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { name, date_of_birth, school, position_1, position_2, position_3, household_id } =
    await req.json();

  if (!name || !position_1 || !position_2 || !position_3) {
    return NextResponse.json({ error: "Name and three positions are required." }, { status: 400 });
  }

  const positions = [position_1, position_2, position_3];
  if (positions.some((p) => !POSITIONS.includes(p))) {
    return NextResponse.json({ error: "Invalid position selected." }, { status: 400 });
  }

  // Work out which household this new child should belong to.
  const [membershipRows] = await pool.query(
    `SELECT h.id, h.name FROM households h
     JOIN household_members hm ON hm.household_id = h.id
     WHERE hm.user_id = ?`,
    [user.id]
  );
  const households = membershipRows as { id: number; name: string | null }[];

  let resolvedHouseholdId: number;

  if (household_id) {
    const match = households.find((h) => h.id === household_id);
    if (!match) {
      return NextResponse.json(
        { error: "You're not a member of that household." },
        { status: 403 }
      );
    }
    resolvedHouseholdId = household_id;
  } else if (households.length === 1) {
    resolvedHouseholdId = households[0].id;
  } else if (households.length === 0) {
    const [[me]] = (await pool.query("SELECT surname FROM users WHERE id = ?", [
      user.id,
    ])) as any[];
    const householdName = me?.surname ? `${me.surname} Household` : null;

    const [result] = await pool.query(
      "INSERT INTO households (name, created_by) VALUES (?, ?)",
      [householdName, user.id]
    );
    resolvedHouseholdId = (result as any).insertId;
    await pool.query(
      "INSERT INTO household_members (household_id, user_id) VALUES (?, ?)",
      [resolvedHouseholdId, user.id]
    );
  } else {
    // Belongs to more than one household — the client needs to ask which
    // one this child goes in rather than guessing.
    return NextResponse.json(
      {
        error: "You belong to more than one household — choose which one this child belongs to.",
        households,
      },
      { status: 409 }
    );
  }

  const [result] = await pool.query(
    `INSERT INTO children (parent_id, household_id, name, date_of_birth, school, position_1, position_2, position_3)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      resolvedHouseholdId,
      name,
      date_of_birth || null,
      school || null,
      position_1,
      position_2,
      position_3,
    ]
  );

  return NextResponse.json({ success: true, id: (result as any).insertId });
}
