// One-time backfill: for every child that predates household support
// (household_id IS NULL), create a single-member household around that
// child's existing parent_id and link the child to it. Safe to re-run —
// children that already have a household_id are skipped.
//
// Run from the project root, after applying migration-households.sql:
//   node scripts/backfill-households.js

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function loadDatabaseUrl() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const env = fs.readFileSync(envPath, "utf8");
  const match = env.match(/^DATABASE_URL=(.*)$/m);
  if (!match) throw new Error("DATABASE_URL not found in .env.local");
  return match[1].trim();
}

async function main() {
  const uri = loadDatabaseUrl();
  const pool = mysql.createPool({ uri });

  const [orphans] = await pool.query(
    "SELECT id, parent_id, name FROM children WHERE household_id IS NULL"
  );

  if (orphans.length === 0) {
    console.log("No children without a household — nothing to backfill.");
    await pool.end();
    return;
  }

  console.log(`Found ${orphans.length} child(ren) without a household. Backfilling...`);

  // Group by parent_id so siblings already added by the same parent land
  // in the same new household, rather than one household per child.
  const byParent = new Map();
  for (const child of orphans) {
    if (!byParent.has(child.parent_id)) byParent.set(child.parent_id, []);
    byParent.get(child.parent_id).push(child);
  }

  for (const [parentId, children] of byParent) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[parent]] = await conn.query(
        "SELECT surname FROM users WHERE id = ?",
        [parentId]
      );
      const householdName = parent?.surname ? `${parent.surname} Household` : null;

      const [result] = await conn.query(
        "INSERT INTO households (name, created_by) VALUES (?, ?)",
        [householdName, parentId]
      );
      const householdId = result.insertId;

      await conn.query(
        "INSERT IGNORE INTO household_members (household_id, user_id) VALUES (?, ?)",
        [householdId, parentId]
      );

      for (const child of children) {
        await conn.query("UPDATE children SET household_id = ? WHERE id = ?", [
          householdId,
          child.id,
        ]);
        console.log(`  - "${child.name}" (child #${child.id}) -> household #${householdId}`);
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  console.log("Backfill complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
