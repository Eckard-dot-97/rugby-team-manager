import { pool } from "./db";

// Whether a user can see/manage a given child — either through direct
// legacy ownership (parent_id) or through shared household membership.
// Shared by the availability, delete, and merge routes so the ownership
// rule only lives in one place.
export async function userCanAccessChild(userId: number, childId: number): Promise<boolean> {
  const [rows] = await pool.query(
    `SELECT c.id FROM children c
     LEFT JOIN household_members hm ON hm.household_id = c.household_id AND hm.user_id = ?
     WHERE c.id = ? AND (hm.user_id IS NOT NULL OR c.parent_id = ?)`,
    [userId, childId, userId]
  );
  return (rows as any[]).length > 0;
}
