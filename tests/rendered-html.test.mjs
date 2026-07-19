import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Identity Guard shell with mock fallback content", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Data Sorters CMDB Identity Guard<\/title>/i);
  assert.match(html, /Identity Guard/);
  assert.match(html, /CMDB governance/);
  assert.match(html, /Start analysis/);
  assert.match(html, /Review queue/);
  assert.match(html, /Guardrails/);
  assert.match(html, /DATA_SORTERS scope/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
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

  assert.match(api, /export type IdentityGuardSummary/);
  assert.match(api, /export type DuplicateGroupDetail/);
  assert.match(api, /normalizeGroup/);
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
