import Database from "better-sqlite3"
import { randomBytes } from "crypto"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, "dev.db")

const db = new Database(DB_PATH)

function cuid() {
  return "c" + randomBytes(10).toString("hex")
}

const EVALUATORS = [
  "Anggraini, A.Md",
  "Deny Rahmat, S.Sos.I",
  "Arifah Hilyati, S.S., M.Pd",
]

const TEACHERS = [
  "Aulia Safitri, S.Pd",
  "Ariyanto, SE",
  "Alfiyyah Nur Lail, S.Pd",
  "Ahmad Marzuki Nasution",
  "Dedi Setiadi",
  "Lulu Lutfiyah, S.Pd",
  "Mochamad Asroru Pahala, S.Pd",
  "Muhammad Faisal, S. Sos.",
  "Mutiara Indah Pratiwi, S.Pd.I",
  "Nur Faidah Djaelani, S.Pd",
  "Syarifatu Zahro, S.Pd",
  "Thio Pratama, S. Kom",
  "Nurhidayatii, S.Pd",
  "Giar Hermawan, S.Kom",
]

const now = new Date().toISOString()

const insertEval = db.prepare(`
  INSERT OR IGNORE INTO Evaluator (id, name, createdAt) VALUES (?, ?, ?)
`)
const insertTeacher = db.prepare(`
  INSERT OR IGNORE INTO Teacher (id, name, createdAt) VALUES (?, ?, ?)
`)

for (const name of EVALUATORS) {
  insertEval.run(cuid(), name, now)
}
console.log(`✓ ${EVALUATORS.length} evaluators seeded`)

for (const name of TEACHERS) {
  insertTeacher.run(cuid(), name, now)
}
console.log(`✓ ${TEACHERS.length} teachers seeded`)

db.close()
console.log("Seeding complete!")
