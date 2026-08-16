# CMDB Identity Guard Offline Demo

A portfolio-ready, no-credentials continuation of the Data Sorters ServiceNow hackathon UI. The application gives CMDB data stewards an explainable workflow for reviewing possible duplicate Configuration Items, comparing candidate evidence, recording simulated decisions, and examining proposed IRE guardrails.

## Offline demo

The default configuration opens directly into synthetic demo data. It does not require a ServiceNow instance, account, API key, database, or network request after dependencies are installed.

Requirements: Node.js 22.13 or later.

```bash
npm install
npm run dev
```

Then open the local URL printed by Vinext. Use **Start analysis**, **Review queue**, and the steward decision controls to exercise the simulated workflow. Every offline decision is explicitly labeled as simulated and does not modify CMDB records.

## Included

- Identity-health overview and analysis run history
- Ranked duplicate review queue
- Side-by-side candidate evidence comparison
- Explainable AI summaries and master-record recommendations
- Steward decision controls with simulated remediation feedback
- Proposed IRE guardrails for unsafe identifiers
- Responsive desktop and mobile layouts
- Typed ServiceNow API adapter in `app/lib/identity-guard-api.ts`
- Optional same-origin ServiceNow proxy at `/api/identity-guard/*`

## Runtime modes

| Mode | Offline demo | Mock data | Authentication | ServiceNow access |
| --- | --- | --- | --- | --- |
| Portfolio demo (default) | `true` | `true` | Not required | None |
| Protected UI demo | `false` | `true` | Demo access gate | None |
| Live integration | `false` | `false` | Demo access gate | Server-side proxy |

Copy `.env.example` to `.env.local` only when changing modes. To use the protected or live modes, set `NEXT_PUBLIC_IDENTITY_GUARD_OFFLINE_DEMO=false` and configure the demo-access values. Live ServiceNow values must remain server-side; never prefix credentials with `NEXT_PUBLIC_` and never commit `.env.local`.

The optional proxy supports:

```text
GET  /api/identity-guard/summary
GET  /api/identity-guard/analysis/runs
GET  /api/identity-guard/duplicate-groups
GET  /api/identity-guard/duplicate-groups/{sys_id}
GET  /api/identity-guard/guardrails
POST /api/identity-guard/duplicate-groups/{sys_id}/decision
POST /api/identity-guard/analysis/start
```

## Project origin and attribution

This repository is a separate continuation of the original [Data Sorters hackathon repository](https://github.com/Phire12/Hackathon_Data_Sorters_UI). It preserves the original Git history and contributor attribution while allowing the offline portfolio demo to evolve without changing the competition project.
