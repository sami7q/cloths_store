import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

// Reset + seed the isolated E2E database (prisma/test.db). Runs BEFORE
// `playwright test` (see the test:e2e script) because Playwright boots the
// webServer before globalSetup — the server must find a seeded DB on its
// first request. The deterministic seed (fixed-RNG) means every run starts
// from the exact same catalog.
//
// test.db is a throwaway artifact owned by this script (gitignored, never
// dev.db): deleting the file and re-pushing into a fresh empty DB replaces
// `db push --force-reset`, so no destructive flag is needed.
const root = path.resolve(__dirname, "..");
for (const suffix of ["", "-journal"]) {
  rmSync(path.join(root, "prisma", `test.db${suffix}`), { force: true });
}

const env = { ...process.env, DATABASE_URL: "file:./test.db" };
const run = (command: string) => execSync(command, { cwd: root, env, stdio: "inherit" });

run("pnpm exec prisma db push --skip-generate");
run("pnpm exec prisma db seed");
