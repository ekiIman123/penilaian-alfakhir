/**
 * Raw SQL migration script:
 * 1. Rename Teacher table → Employee
 * 2. Rename Evaluation.teacherId → employeeId
 * 3. Update foreign key constraint
 * 4. Update unique constraint on Employee (add lembaga column first)
 * 5. Update unique constraint on Evaluator
 */
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })

async function main() {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // ── 1. Rename Teacher → Employee (if it exists) ──────────────────────────
    const teacherExists = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'Teacher'
    `)
    if (teacherExists.rows.length > 0) {
      console.log("Renaming Teacher → Employee...")
      await client.query(`ALTER TABLE "Teacher" RENAME TO "Employee"`)
      console.log("Done.")
    } else {
      console.log("Teacher table not found — already renamed or doesn't exist.")
    }

    // ── 2. Rename Evaluation.teacherId → employeeId (if it exists) ────────────
    const teacherIdColExists = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Evaluation' AND column_name = 'teacherId'
    `)
    if (teacherIdColExists.rows.length > 0) {
      console.log("Renaming Evaluation.teacherId → employeeId...")
      await client.query(`ALTER TABLE "Evaluation" RENAME COLUMN "teacherId" TO "employeeId"`)
      console.log("Done.")
    } else {
      console.log("Evaluation.teacherId not found — already renamed or doesn't exist.")
    }

    // ── 3. Drop old unique constraint on Evaluator (name @unique) ─────────────
    // Find the constraint name for Evaluator.name unique
    const evalUniqueConstraints = await client.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'Evaluator'
        AND constraint_type = 'UNIQUE'
    `)
    for (const row of evalUniqueConstraints.rows) {
      // Drop constraints that are only on the name column (single-col unique)
      const colsResult = await client.query(`
        SELECT column_name FROM information_schema.key_column_usage
        WHERE table_schema = 'public'
          AND table_name = 'Evaluator'
          AND constraint_name = $1
      `, [row.constraint_name])
      const cols = colsResult.rows.map((r: { column_name: string }) => r.column_name)
      if (cols.length === 1 && cols[0] === "name") {
        console.log(`Dropping Evaluator unique constraint: ${row.constraint_name}`)
        await client.query(`ALTER TABLE "Evaluator" DROP CONSTRAINT "${row.constraint_name}"`)
      }
    }

    // ── 4. Drop old unique constraint on Employee (name, role) ────────────────
    // (Prisma will recreate as name, role, lembaga after db push)
    const empUniqueConstraints = await client.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'Employee'
        AND constraint_type = 'UNIQUE'
    `)
    for (const row of empUniqueConstraints.rows) {
      const colsResult = await client.query(`
        SELECT column_name FROM information_schema.key_column_usage
        WHERE table_schema = 'public'
          AND table_name = 'Employee'
          AND constraint_name = $1
        ORDER BY ordinal_position
      `, [row.constraint_name])
      const cols = colsResult.rows.map((r: { column_name: string }) => r.column_name)
      // Drop if it's the (name, role) 2-col unique
      if (cols.length === 2 && cols.includes("name") && cols.includes("role")) {
        console.log(`Dropping Employee unique constraint: ${row.constraint_name}`)
        await client.query(`ALTER TABLE "Employee" DROP CONSTRAINT "${row.constraint_name}"`)
      }
    }

    // ── 5. Drop old unique constraint on Evaluation (evaluatorId, teacherId) ──
    const evalEvalConstraints = await client.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'Evaluation'
        AND constraint_type = 'UNIQUE'
    `)
    for (const row of evalEvalConstraints.rows) {
      const colsResult = await client.query(`
        SELECT column_name FROM information_schema.key_column_usage
        WHERE table_schema = 'public'
          AND table_name = 'Evaluation'
          AND constraint_name = $1
        ORDER BY ordinal_position
      `, [row.constraint_name])
      const cols = colsResult.rows.map((r: { column_name: string }) => r.column_name)
      // Drop if it contains teacherId (old constraint)
      if (cols.includes("teacherId")) {
        console.log(`Dropping Evaluation unique constraint with teacherId: ${row.constraint_name}`)
        await client.query(`ALTER TABLE "Evaluation" DROP CONSTRAINT "${row.constraint_name}"`)
      }
    }

    await client.query("COMMIT")
    console.log("Migration committed successfully.")
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Migration failed, rolled back:", err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
