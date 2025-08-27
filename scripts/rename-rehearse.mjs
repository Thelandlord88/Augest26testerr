// scripts/rename-rehearse.mjs
// Orchestrator: scan → baseline build → universal what-if (preview) → preview redirect validation.
// Examples:
//   node scripts/rename-rehearse.mjs --preview=https://<preview>.netlify.app --base=blog:articles
//   node scripts/rename-rehearse.mjs --preview=https://<preview>.netlify.app \
//        --base=blog:articles --cluster=brisbane-west:brisbane --cluster=ipswich-region:ipswich \
//        --service=bond-cleaning:end-of-lease-cleaning --page=quote:get-quote \
//        --sample-slug=my-post --sample-suburb=forest-lake

import { spawn } from "node:child_process";

function parseArgs() {
  return Object.fromEntries(process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }));
}
const args = parseArgs();
const PREVIEW = args.preview || process.env.PREVIEW_URL || "";

function run(cmd, argv, env = {}) {
  return new Promise((resolve, reject) => {
    const cp = spawn(cmd, argv, { stdio: "inherit", shell: true, env: { ...process.env, ...env } });
    cp.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${argv.join(" ")} exited ${code}`))));
  });
}

(async () => {
  // 1) Static scan
  await run("node", ["scripts/refactor-scan.mjs"]);

  // 2) Baseline build & reports
  await run("npm", ["run", "ai:baseline"]);

  // 3) What-if (if preview provided)
  const whatIfArgs = ["scripts/refactor-whatif.mjs"];
  // Back-compat: --blog-base=example -> --base=blog:example
  if (args["blog-base"]) whatIfArgs.push(`--base=blog:${args["blog-base"]}`);
  // Forward universal flags as-is
  for (const k of ["base", "cluster", "service", "page", "sample-slug", "sample-suburb", "preview"]) {
    if (args[k]) whatIfArgs.push(`--${k}=${args[k]}`);
  }
  if (PREVIEW) await run("node", whatIfArgs, { PREVIEW_URL: PREVIEW });

  // 4) Full preview validation (redirects)
  if (PREVIEW) await run("npm", ["run", "ai:validate:redirects"], { PREVIEW_URL: PREVIEW });

  console.log("✅ rename rehearsal finished");
})().catch(err => {
  console.error("❌ rename rehearsal failed:", err.message);
  process.exit(1);
});
