import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("DATABASE_URL and DATABASE_AUTH_TOKEN are required");
  process.exit(1);
}

const client = createClient({ url, authToken });

const migrationsDir = join(process.cwd(), "prisma", "migrations");
const folders = readdirSync(migrationsDir)
  .filter((f) => !f.startsWith(".") && f !== "migration_lock.toml")
  .sort();

for (const folder of folders) {
  const sqlPath = join(migrationsDir, folder, "migration.sql");
  const sql = readFileSync(sqlPath, "utf-8");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Applying: ${folder}`);
  for (const stmt of statements) {
    await client.execute(stmt);
  }
}

console.log("Migrations applied successfully.");
client.close();
