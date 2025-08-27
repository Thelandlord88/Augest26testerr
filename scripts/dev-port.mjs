// scripts/dev-port.mjs
import { spawn } from "node:child_process";
const port = process.env.PORT && /^\d+$/.test(process.env.PORT) ? process.env.PORT : "4322";
const cp = spawn("astro", ["dev", "--port", port, "--host", "0.0.0.0"], { stdio: "inherit", shell: true });
cp.on("exit", (code) => process.exit(code ?? 0));
