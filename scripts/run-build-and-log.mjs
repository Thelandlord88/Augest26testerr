// scripts/run-build-and-log.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";

fs.mkdirSync("__ai", { recursive: true });
const out = fs.createWriteStream("__ai/build.log", { flags: "w" });

const cp = spawn("npm", ["run", "build", "--silent"], { shell: true });
cp.stdout.pipe(process.stdout);
cp.stdout.pipe(out);
cp.stderr.pipe(process.stderr);
cp.stderr.pipe(out);

cp.on("exit", (code) => {
  out.end(() => process.exit(code ?? 0));
});
