import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";
const skip = process.env.SKIP_DB_SEED === "1" || process.env.SKIP_DB_SEED === "true";

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

console.log("[build] Executando prisma db seed...");
execSync("npx prisma db seed", { stdio: "inherit" });
