// scripts/preview.mjs
import { spawn } from "node:child_process";
const env = { ...process.env, USE_NETLIFY: "1" };
const cp = spawn("astro", ["preview"], { stdio: "inherit", shell: true, env });
cp.on("exit", (code) => process.exit(code ?? 0));
