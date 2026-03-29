/**
 * Root deployment entrypoint. Runs Hardhat deploy from /contracts.
 * Usage: node scripts/deploy.js [--network sepolia|hardhat]
 */
const { spawnSync } = require("child_process");
const path = require("path");

const network =
  process.argv.includes("--network") && process.argv[process.argv.indexOf("--network") + 1]
    ? process.argv[process.argv.indexOf("--network") + 1]
    : "sepolia";

const contractsDir = path.join(__dirname, "..", "contracts");
const r = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["hardhat", "run", "scripts/deploy.js", "--network", network],
  { cwd: contractsDir, stdio: "inherit", shell: true }
);
process.exit(r.status ?? 1);
