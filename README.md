# Data Sorters CMDB Identity Guard UI

Minimal, square-edged steward experience for the Data Sorters ServiceNow hackathon project.

## Included

- Overview and identity-health metrics
- Analysis run history
- Duplicate review queue
- Candidate evidence comparison
- IRE guardrail proposals
- Steward decision controls
- Responsive layouts
- Mock records for development
- A typed ServiceNow API adapter in `app/lib/identity-guard-api.ts`

## Local development

Requirements: Node.js 22.13 or later.

```bash
npm install
npm run dev
```

## API integration

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_IDENTITY_GUARD_API_BASE` to a same-origin backend proxy. The UI should not contain ServiceNow usernames, passwords, client secrets, or permanent tokens.

Expected backend routes:

```text
GET  /summary
GET  /analysis/runs
GET  /duplicate-groups
GET  /duplicate-groups/{sys_id}
GET  /guardrails
POST /duplicate-groups/{sys_id}/decision
POST /analysis/start
```

The current screens use mock records so the interface remains demoable while the analyzer is completed. The next implementation step is replacing each mock collection in `app/page.tsx` with calls from `identityGuardApi` and adding loading/error states.

## GitHub
This directory is already initialized on branch `main`. Add your empty GitHub repository as `origin`, commit, and push when ready.
