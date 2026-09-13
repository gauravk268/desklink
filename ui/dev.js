import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(__dirname, "../api");

console.log("\x1b[36m[desklink]\x1b[0m Starting API and UI dev servers...");

const pythonBin = path.join(apiDir, ".venv/bin/python3");
const apiProcess = spawn(pythonBin, ["app.py"], {
  cwd: apiDir,
  stdio: "inherit",
});

const viteProcess = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vite", "--host"],
  {
    cwd: __dirname,
    stdio: "inherit",
  }
);

let isShuttingDown = false;

function cleanShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n\x1b[33m[desklink]\x1b[0m Caught ${signal}, shutting down processes...`);

  try {
    if (apiProcess.pid) process.kill(apiProcess.pid, "SIGTERM");
  } catch {}

  try {
    if (viteProcess.pid) process.kill(viteProcess.pid, "SIGTERM");
  } catch {}

  setTimeout(() => {
    try {
      if (apiProcess.pid) process.kill(apiProcess.pid, "SIGKILL");
    } catch {}
    try {
      if (viteProcess.pid) process.kill(viteProcess.pid, "SIGKILL");
    } catch {}
    process.exit(0);
  }, 1200);
}

process.on("SIGINT", () => cleanShutdown("SIGINT"));
process.on("SIGTERM", () => cleanShutdown("SIGTERM"));
process.on("exit", () => cleanShutdown("exit"));

apiProcess.on("exit", (code) => {
  if (!isShuttingDown) {
    console.log(`\x1b[31m[api]\x1b[0m Exited with code ${code}`);
    cleanShutdown("SIGTERM");
  }
});

viteProcess.on("exit", (code) => {
  if (!isShuttingDown) {
    console.log(`\x1b[35m[ui]\x1b[0m Exited with code ${code}`);
    cleanShutdown("SIGTERM");
  }
});
