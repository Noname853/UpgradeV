/**
 * Cross-target DB backup. Works for both local SQLite and remote libSQL (Turso).
 *
 * Local:   uses sqlite3 .dump via Node's libsql client over file: URL.
 * Turso:   same — libsql client speaks both transparently.
 *
 * Output: writes a timestamped .sql dump into ./backups/ (gitignored).
 * Set BACKUP_DIR to redirect; CI workflows can upload the file as an artifact
 * or push it to object storage (S3/R2) after the script finishes.
 */
import { createClient } from '@libsql/client'
import { mkdirSync, createWriteStream } from 'node:fs'
import { join } from 'node:path'

const url = process.env.DATABASE_URL ?? 'file:./dev.db'
const authToken = process.env.DATABASE_AUTH_TOKEN
const dir = process.env.BACKUP_DIR ?? './backups'

async function main() {
  mkdirSync(dir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const outPath = join(dir, `backup-${ts}.sql`)
  const out = createWriteStream(outPath)

  const client = createClient({ url, authToken })

  // Schema first, then data — in dependency order so the dump can be replayed.
  const tables = await client.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_migrations' ORDER BY name",
  )

  out.write('PRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n\n')

  for (const row of tables.rows) {
    const name = row.name as string
    const ddl = row.sql as string
    out.write(`-- ── ${name} ──\n${ddl};\n\n`)
  }

  for (const row of tables.rows) {
    const name = row.name as string
    const data = await client.execute(`SELECT * FROM "${name}"`)
    if (data.rows.length === 0) continue
    const cols = data.columns.map((c) => `"${c}"`).join(', ')
    for (const r of data.rows) {
      const vals = data.columns
        .map((c) => {
          const v = r[c]
          if (v === null) return 'NULL'
          if (typeof v === 'number') return String(v)
          if (typeof v === 'bigint') return String(v)
          return `'${String(v).replace(/'/g, "''")}'`
        })
        .join(', ')
      out.write(`INSERT INTO "${name}" (${cols}) VALUES (${vals});\n`)
    }
    out.write('\n')
  }

  out.write('COMMIT;\nPRAGMA foreign_keys=ON;\n')
  out.end()

  await new Promise<void>((resolve, reject) => {
    out.on('finish', () => resolve())
    out.on('error', reject)
  })

  client.close()
  console.log(`Backup written: ${outPath}`)
}

main().catch((err) => {
  console.error('Backup failed:', err)
  process.exit(1)
})
