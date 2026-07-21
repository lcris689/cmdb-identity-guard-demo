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
- Mock records for development and demo fallback
- A typed ServiceNow API adapter in `app/lib/identity-guard-api.ts`
- A same-origin server-side proxy at `/api/identity-guard/*`

## Local development

Requirements: Node.js 22.13 or later.

```bash
npm install
npm run dev
```

## API integration

Copy `.env.example` to `.env.local`.

Configure the server-side demo access gate. Use a unique password for the demonstration and a random session secret containing at least 32 characters:

```env
DEMO_ACCESS_USERNAME=user
DEMO_ACCESS_PASSWORD=123
DEMO_SESSION_SECRET=11111111111111111111111111111111
```

The login creates a four-hour HTTP-only, same-site signed session cookie. The ServiceNow proxy rejects requests that do not have a valid demo session. Never commit the real values.

Keep the browser-facing API base pointed at the included same-origin proxy:

```env
NEXT_PUBLIC_IDENTITY_GUARD_API_BASE=/api/identity-guard
```

Keep mock mode enabled for safe UI-only demos:

```env
NEXT_PUBLIC_IDENTITY_GUARD_USE_MOCKS=true
```

Set mock mode to false when the server-side ServiceNow proxy is configured:

```env
NEXT_PUBLIC_IDENTITY_GUARD_USE_MOCKS=false
```

Server-side ServiceNow configuration belongs only in `.env.local` or deployment secrets. Do not prefix credentials with `NEXT_PUBLIC_` and do not commit them.

```env
SERVICENOW_INSTANCE_URL=https://YOUR_INSTANCE.service-now.com
SERVICENOW_IDENTITY_GUARD_PATH=/api/x_kest_data_sort/data_sorters_identity_guard_api
SERVICENOW_BEARER_TOKEN=
SERVICENOW_USERNAME=data.sorters.api
SERVICENOW_PASSWORD=
```

Use either `SERVICENOW_BEARER_TOKEN` or `SERVICENOW_USERNAME` plus `SERVICENOW_PASSWORD`.

The UI calls these same-origin proxy routes:

```text
GET  /api/identity-guard/summary
GET  /api/identity-guard/analysis/runs
GET  /api/identity-guard/duplicate-groups
GET  /api/identity-guard/duplicate-groups/{sys_id}
GET  /api/identity-guard/guardrails
POST /api/identity-guard/duplicate-groups/{sys_id}/decision
POST /api/identity-guard/analysis/start
```

The proxy forwards to the Data Sorters scoped ServiceNow API base path:

```text
/api/x_kest_data_sort/data_sorters_identity_guard_api
```

## GitHub

This directory is initialized from `https://github.com/Phire12/Hackathon_Data_Sorters_UI`.
