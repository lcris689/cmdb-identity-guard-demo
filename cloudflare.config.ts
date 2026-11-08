import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "cmdb-identity-guard-demo",
    entrypoint: "./worker/index.ts",
    compatibilityDate: "2026-11-08",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      NEXT_PUBLIC_IDENTITY_GUARD_OFFLINE_DEMO: bindings.text("true"),
      NEXT_PUBLIC_IDENTITY_GUARD_USE_MOCKS: bindings.text("true"),
      NEXT_PUBLIC_IDENTITY_GUARD_API_BASE: bindings.text("/api/identity-guard"),
    },
  }),
});
