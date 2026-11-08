import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

async function render() {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const viteCli = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
  const port = 4174;
  const preview = spawn(
    process.execPath,
    [viteCli, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  let output = "";
  preview.stdout.on("data", (chunk) => { output += chunk; });
  preview.stderr.on("data", (chunk) => { output += chunk; });

  try {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (preview.exitCode !== null)
        throw new Error(`Vite preview exited before becoming ready.\n${output}`);

      try {
        const response = await fetch(`http://127.0.0.1:${port}/`, {
          headers: { accept: "text/html" },
        });
        if (response.ok) {
          return {
            status: response.status,
            contentType: response.headers.get("content-type") ?? "",
            html: await response.text(),
          };
        }
      } catch {
        // The preview server may still be starting.
      }
      await delay(50);
    }
    throw new Error(`Timed out waiting for Vite preview.\n${output}`);
  } finally {
    if (preview.exitCode === null) {
      preview.kill();
      await Promise.race([once(preview, "exit"), delay(2_000)]);
    }
    if (preview.exitCode === null) preview.kill("SIGKILL");
  }
}

test("server-renders an immediately usable offline Identity Guard demo", async () => {
  const { status, contentType, html } = await render();
  assert.equal(status, 200);
  assert.match(contentType, /^text\/html\b/i);
  assert.match(html, /<title>Data Sorters CMDB Identity Guard<\/title>/i);
  assert.match(html, /CMDB Identity Guard/);
  assert.match(html, /Offline demo/);
  assert.match(html, /Identity risk, made reviewable/);
  assert.doesNotMatch(html, /Demo access/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("offline mode is explicit and keeps live ServiceNow access opt-in", async () => {
  const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(envExample, /NEXT_PUBLIC_IDENTITY_GUARD_OFFLINE_DEMO=true/);
  assert.match(page, /NEXT_PUBLIC_IDENTITY_GUARD_OFFLINE_DEMO/);
  assert.match(page, /Offline demo · synthetic data only/);
});

test("offline interactions never imply that live CMDB records were changed", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /Synthetic data for offline demonstration/);
  assert.match(page, /No CMDB records were changed/);
  assert.match(page, /SIMULATED STEWARD DECISION/);
  assert.doesNotMatch(page, /Disable mock mode/);
});

test("page uses the typed Identity Guard API with mock fallback and async UI states", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const api = await readFile(new URL("../app/lib/identity-guard-api.ts", import.meta.url), "utf8");

  assert.match(page, /identityGuardApi/);
  assert.match(page, /NEXT_PUBLIC_IDENTITY_GUARD_USE_MOCKS/);
  assert.match(page, /useEffect/);
  assert.match(page, /Loading ServiceNow data/);
  assert.match(page, /Unable to load ServiceNow data/);
  assert.match(page, /No duplicate groups found/);
  assert.match(page, /submitDecision|identityGuardApi\.decide/);
  assert.match(page, /runStartAnalysis|identityGuardApi\.startAnalysis/);
  assert.match(page, /identityGuardApi\.group\(/);
  assert.match(page, /Latest run/);
  assert.match(page, /identityGuardApi\.groups\(1, latestRunSysId\)/);
  assert.match(page, /Steward decision notes/);
  assert.match(page, /decisionNotes/);
  assert.match(page, /stewardFacingAction/);
  assert.match(page, /master record\\s\+\(\[0-9a-f\]\{32\}\)\\s\+as valid/);

  assert.match(api, /export type IdentityGuardSummary/);
  assert.match(api, /export type DuplicateGroupDetail/);
  assert.match(api, /normalizeGroup/);
  assert.match(api, /match_evidence/);
  assert.match(api, /recordFromJson/);
  assert.match(api, /analysis_run/);
  assert.match(api, /URLSearchParams/);
  assert.match(api, /startAnalysis/);
});

test("keeps ServiceNow secrets out of browser-exposed configuration", async () => {
  const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const api = await readFile(new URL("../app/lib/identity-guard-api.ts", import.meta.url), "utf8");

  const combined = `${envExample}\n${page}\n${api}`;
  assert.doesNotMatch(combined, /NEXT_PUBLIC_.*(?:PASSWORD|SECRET|TOKEN|USER)/i);
  assert.doesNotMatch(combined, /Basic\s+[A-Za-z0-9+/=]+|Authorization['"]\s*:/i);
  assert.match(envExample, /NEXT_PUBLIC_IDENTITY_GUARD_API_BASE/);
});

test("Identity Guard proxy uses server-only ServiceNow configuration", async () => {
  const route = await readFile(new URL("../app/api/identity-guard/[...path]/route.ts", import.meta.url), "utf8");
  const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");

  assert.match(route, /SERVICENOW_INSTANCE_URL/);
  assert.match(route, /SERVICENOW_IDENTITY_GUARD_PATH/);
  assert.match(route, /\/api\/x_kest_data_sort\/data_sorters_identity_guard_api/);
  assert.match(route, /Authorization/);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(envExample, /SERVICENOW_IDENTITY_GUARD_PATH=\/api\/x_kest_data_sort\/data_sorters_identity_guard_api/);
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_SERVICENOW_(USERNAME|PASSWORD|BEARER|TOKEN)/i);
});

test("offline public mode rejects direct Identity Guard proxy requests", async () => {
  const route = await readFile(new URL("../app/api/identity-guard/[...path]/route.ts", import.meta.url), "utf8");

  assert.match(route, /NEXT_PUBLIC_IDENTITY_GUARD_OFFLINE_DEMO/);
  assert.match(route, /OFFLINE_DEMO_ONLY/);
  assert.match(route, /status:\s*403/);
});

test("Cloudflare deployment explicitly enables only the synthetic offline client", async () => {
  const cloudflareConfig = await readFile(
    new URL("../cloudflare.config.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    cloudflareConfig,
    /NEXT_PUBLIC_IDENTITY_GUARD_OFFLINE_DEMO:\s*bindings\.text\("true"\)/,
  );
  assert.match(
    cloudflareConfig,
    /NEXT_PUBLIC_IDENTITY_GUARD_USE_MOCKS:\s*bindings\.text\("true"\)/,
  );
  assert.match(
    cloudflareConfig,
    /NEXT_PUBLIC_IDENTITY_GUARD_API_BASE:\s*bindings\.text\("\/api\/identity-guard"\)/,
  );
  assert.doesNotMatch(cloudflareConfig, /SERVICENOW_(?:INSTANCE|USERNAME|PASSWORD|TOKEN)/);
});
