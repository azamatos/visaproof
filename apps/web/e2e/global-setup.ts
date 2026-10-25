import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

// A fresh test database before the browser tests: the pipeline's migrations, the made-up roles in seed.sql, and
// their technologies. E2E_DATABASE_URL names it (CI's service, or a database on the local copy's server).
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://sponsored@localhost:5433/visaproof_e2e";

export default async function globalSetup() {
  const url = new URL(E2E_DATABASE_URL);
  const name = url.pathname.slice(1);
  const admin = postgres({ ...parts(url), database: "postgres", onnotice: () => {} });
  const [exists] = await admin`select 1 from pg_database where datname = ${name}`;
  if (!exists) await admin.unsafe(`create database "${name.replace(/"/g, "")}"`);
  await admin.end();

  const sql = postgres(E2E_DATABASE_URL, { onnotice: () => {} });
  await sql.unsafe("drop schema public cascade; create schema public");
  await sql.end();

  const pipeline = path.join(import.meta.dirname, "..", "..", "pipeline");
  const cli = (...args: string[]) =>
    execFileSync("node", ["src/cli.ts", ...args], {
      cwd: pipeline,
      env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
      stdio: "inherit",
    });
  cli("migrate");
  const seeded = postgres(E2E_DATABASE_URL, { onnotice: () => {} });
  await seeded.unsafe(readFileSync(path.join(import.meta.dirname, "seed.sql"), "utf8"));
  await seeded.end();
  cli("technologies");
}

function parts(url: URL) {
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
}
