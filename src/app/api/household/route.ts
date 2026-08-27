import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Everything the logged-in parent needs to see about the household(s)
// they're a member of: co-parents, children, and any invites still
// pending. A parent can belong to more than one household.
export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const [householdRows] = await pool.query(
    `SELECT h.id, h.name, h.created_by
     FROM households h
     JOIN household_members hm ON hm.household_id = h.id
     WHERE hm.user_id = ?
     ORDER BY h.id`,
    [user.id]
  );
  const households = householdRows as { id: number; name: string | null; created_by: number }[];

  if (households.length === 0) {
    return NextResponse.json({ households: [] });
  }

  const householdIds = households.map((h) => h.id);

  const [memberRows] = await pool.query(
    `SELECT hm.household_id, u.id, u.name, u.surname, u.email
     FROM household_members hm
     JOIN users u ON u.id = hm.user_id
     WHERE hm.household_id IN (?)
     ORDER BY u.name`,
    [householdIds]
  );

  const [childRows] = await pool.query(
    `SELECT household_id, id, name FROM children WHERE household_id IN (?) ORDER BY name`,
    [householdIds]
  );

  const [inviteRows] = await pool.query(
    `SELECT id, household_id, invited_email, created_at, expires_at
     FROM household_invites
     WHERE household_id IN (?) AND status = 'pending' AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [householdIds]
  );

  const result = households.map((h) => ({
    id: h.id,
    name: h.name || "Household",
    members: (memberRows as any[]).filter((m) => m.household_id === h.id).map((m) => ({
      id: m.id,
      name: m.name,
      surname: m.surname,
      email: m.email,
    })),
    children: (childRows as any[])
      .filter((c) => c.household_id === h.id)
      .map((c) => ({ id: c.id, name: c.name })),
    pending_invites: (inviteRows as any[])
      .filter((i) => i.household_id === h.id)
      .map((i) => ({
        id: i.id,
        email: i.invited_email,
        created_at: i.created_at,
        expires_at: i.expires_at,
      })),
  }));

  return NextResponse.json({ households: result });
}
