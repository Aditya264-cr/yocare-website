import { spawn } from "node:child_process";

const attempts = 3;
const delaysMs = [10_000, 20_000];

function runDeploy() {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "npx.cmd" : "npx";
    const child = spawn(command, ["wrangler@4.155.0", "deploy"], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", (error) => {
      console.error("Could not start Wrangler:", error.message);
      resolve(1);
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  console.log(`\n[deploy retry] Wrangler deployment attempt ${attempt}/${attempts}`);
  const exitCode = await runDeploy();

  if (exitCode === 0) {
    console.log("[deploy retry] Deployment succeeded.");
    process.exit(0);
  }

  if (attempt < attempts) {
    const delay = delaysMs[attempt - 1];
    console.error(`[deploy retry] Deployment failed (exit ${exitCode}); retrying in ${delay / 1000}s.`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  } else {
    console.error("[deploy retry] All deployment attempts failed.");
    process.exit(exitCode);
  }
}
