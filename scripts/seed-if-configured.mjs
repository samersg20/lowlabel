import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";
const skip = process.env.SKIP_DB_SEED === "1" || process.env.SKIP_DB_SEED === "true";
const strictSeed = process.env.STRICT_DB_SEED === "1" || process.env.STRICT_DB_SEED === "true";

if (skip) {
  console.log("[build] SKIP_DB_SEED habilitado; seed ignorado.");
  process.exit(0);
}

if (!url) {
  console.log("[build] DATABASE_URL não definida; seed ignorado.");
  process.exit(0);
}

if (!/^postgres(ql)?:\/\//i.test(url)) {
  console.log("[build] DATABASE_URL não é PostgreSQL; seed ignorado.");
  process.exit(0);
}

function run(cmd) {
  try {
    const output = execSync(cmd, { stdio: "pipe" });
    if (output?.length) process.stdout.write(output.toString());
    return { ok: true, text: output?.toString() || "" };
  } catch (error) {
    const stdout = error?.stdout?.toString?.() || "";
    const stderr = error?.stderr?.toString?.() || "";
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    return { ok: false, text: `${stdout}\n${stderr}` };
  }
}

function extractFailedMigrationName(outputText) {
  const match = outputText.match(/The `([^`]+)` migration .* failed/i);
  return match?.[1] || null;
}

console.log("[build] Executando prisma migrate deploy...");
let migrate = run("npx prisma migrate deploy");

if (!migrate.ok && migrate.text.includes("Error: P3009")) {
  const failedMigration = extractFailedMigrationName(migrate.text);
  if (failedMigration) {
    console.log(`[build] Detectada migration falha (${failedMigration}). Tentando marcar como rolled-back...`);
    const resolve = run(`npx prisma migrate resolve --rolled-back ${failedMigration}`);
    if (!resolve.ok) {
      throw new Error(`[build] Falha ao resolver migration ${failedMigration}.`);
    }

    console.log("[build] Reexecutando prisma migrate deploy...");
    migrate = run("npx prisma migrate deploy");
  }
}

if (!migrate.ok) {
  throw new Error("[build] prisma migrate deploy falhou.");
}

console.log("[build] Executando prisma db seed...");
const seed = run("npx prisma db seed");
if (!seed.ok) {
  if (strictSeed) {
    throw new Error("[build] prisma db seed falhou.");
  }
  console.warn("[build] Aviso: prisma db seed falhou; seguindo build sem seed. Defina STRICT_DB_SEED=1 para falhar em caso de erro.");
}
