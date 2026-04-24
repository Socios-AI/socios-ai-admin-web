# socios-ai-admin-web

Painel administrativo do ecossistema Sócios AI. Vive em `admin.sociosai.com`. Consome `@socios-ai/auth` e o backend de Identity Core (Plan A).

## Pre-requisitos

- Node 20+
- Acesso ao Supabase project `axyssxqttfnbtawanasf`
- `.env.local` baseado em `.env.example`

## Dev

```bash
npm install
npm run dev
```

App roda em http://localhost:3001 .

## Test

```bash
npm run test          # vitest unit
npm run e2e           # playwright (requires local supabase running)
```

## Deploy

Push to `main` triggers `.github/workflows/deploy.yml`. Image is built and pushed to GHCR, then SSH-deployed to DeployServer at `/opt/socios-ai-admin-web/`.

## Routes

| Path | Description |
|---|---|
| `/` | Dashboard |
| `/users` | List + search |
| `/users/[id]` | User detail (read-only in v1) |
| `/_403` | Forbidden page |
| `/signout` | POST handler: signs out + redirects to id login |

## Status

E.3a: read-only dashboard, deployed.
E.3b: write actions (promote/demote/invite/grant/revoke). Pending.
E.3c: impersonate flow. Pending.
