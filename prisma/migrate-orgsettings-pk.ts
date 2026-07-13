/**
 * Raw SQL: Add lembaga column to tables, update OrgSettings PK name,
 * and add new unique constraints.
 * Run AFTER migrate-schema.ts.
 */
import pg from "pg"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })

async function columnExists(client: pg.PoolClient, table: string, col: string): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [table, col]
  )
  return res.rows.length > 0
}

async function constraintExists(client: pg.PoolClient, table: string, name: string): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM information_schema.table_constraints
     WHERE table_schema='public' AND table_name=$1 AND constraint_name=$2`,
    [table, name]
  )
  return res.rows.length > 0
}

async function main() {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // ── 1. Add lembaga to Employee ─────────────────────────────────────────
    if (!await columnExists(client, "Employee", "lembaga")) {
      console.log("Adding lembaga to Employee...")
      await client.query(`ALTER TABLE "Employee" ADD COLUMN "lembaga" TEXT NOT NULL DEFAULT 'alfakhir'`)
    } else {
      console.log("Employee.lembaga already exists.")
    }

    // ── 2. Add lembaga to Evaluator ───────────────────────────────────────
    if (!await columnExists(client, "Evaluator", "lembaga")) {
      console.log("Adding lembaga to Evaluator...")
      await client.query(`ALTER TABLE "Evaluator" ADD COLUMN "lembaga" TEXT NOT NULL DEFAULT 'alfakhir'`)
    } else {
      console.log("Evaluator.lembaga already exists.")
    }

    // ── 3. Add lembaga to Evaluation ──────────────────────────────────────
    if (!await columnExists(client, "Evaluation", "lembaga")) {
      console.log("Adding lembaga to Evaluation...")
      await client.query(`ALTER TABLE "Evaluation" ADD COLUMN "lembaga" TEXT NOT NULL DEFAULT 'alfakhir'`)
    } else {
      console.log("Evaluation.lembaga already exists.")
    }

    // ── 4. Add lembaga to OrgSettings ─────────────────────────────────────
    if (!await columnExists(client, "OrgSettings", "lembaga")) {
      console.log("Adding lembaga to OrgSettings...")
      await client.query(`ALTER TABLE "OrgSettings" ADD COLUMN "lembaga" TEXT NOT NULL DEFAULT 'alfakhir'`)
    } else {
      console.log("OrgSettings.lembaga already exists.")
    }

    // ── 5. Add new unique constraint on Employee(name, role, lembaga) ─────
    const empNewUniq = "Employee_name_role_lembaga_key"
    if (!await constraintExists(client, "Employee", empNewUniq)) {
      console.log("Adding Employee unique(name, role, lembaga)...")
      await client.query(`ALTER TABLE "Employee" ADD CONSTRAINT "${empNewUniq}" UNIQUE ("name", "role", "lembaga")`)
    } else {
      console.log("Employee unique(name,role,lembaga) already exists.")
    }

    // ── 6. Add new unique constraint on Evaluator(name, lembaga) ─────────
    const evalNewUniq = "Evaluator_name_lembaga_key"
    if (!await constraintExists(client, "Evaluator", evalNewUniq)) {
      console.log("Adding Evaluator unique(name, lembaga)...")
      await client.query(`ALTER TABLE "Evaluator" ADD CONSTRAINT "${evalNewUniq}" UNIQUE ("name", "lembaga")`)
    } else {
      console.log("Evaluator unique(name,lembaga) already exists.")
    }

    // ── 7. Add unique constraint on Evaluation(evaluatorId, employeeId) ───
    const evalEmpUniq = "Evaluation_evaluatorId_employeeId_key"
    if (!await constraintExists(client, "Evaluation", evalEmpUniq)) {
      console.log("Adding Evaluation unique(evaluatorId, employeeId)...")
      await client.query(`ALTER TABLE "Evaluation" ADD CONSTRAINT "${evalEmpUniq}" UNIQUE ("evaluatorId", "employeeId")`)
    } else {
      console.log("Evaluation unique(evaluatorId,employeeId) already exists.")
    }

    // ── 8. Rename OrgSettings PK constraint (Prisma expects a specific name) ─
    // Prisma 7 expects the PK constraint to be named "OrgSettings_pkey"
    // Check existing PK name
    const pkRes = await client.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_schema='public' AND table_name='OrgSettings' AND constraint_type='PRIMARY KEY'
    `)
    if (pkRes.rows.length > 0) {
      const currentPkName = pkRes.rows[0].constraint_name
      const expectedPkName = "OrgSettings_pkey"
      if (currentPkName !== expectedPkName) {
        console.log(`Renaming OrgSettings PK: ${currentPkName} → ${expectedPkName}`)
        await client.query(`ALTER INDEX "${currentPkName}" RENAME TO "${expectedPkName}"`)
      } else {
        console.log("OrgSettings PK already named correctly.")
      }
    }

    await client.query("COMMIT")
    console.log("All column/constraint migrations committed successfully.")
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
