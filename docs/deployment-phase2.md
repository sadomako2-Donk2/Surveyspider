# Phase 2 production setup on Render (for cut-over, step 10)

Nothing here is needed yet. The live site keeps running on Phase 1 until cut-over.

## 1. Database
1. Render dashboard → **New +** → **PostgreSQL**.
2. Name `afrimetrica-db`, same region as the web service, PostgreSQL 16, plan **Basic** or higher (the free plan expires after 30 days, so it isn't suitable for real data).
3. After it's created, copy the **Internal Database URL**.
4. Turn on backups appropriate to the plan, and note the retention period in `docs/security.md`.

## 2. Web service (a new service, alongside the Phase 1 one)
- **Root directory:** `apps/web`
- **Build command:** `npm ci && npm run db:deploy && npm run build`
- **Start command:** `npm start`
- **Health check path:** `/healthz`
- **Environment:** `DATABASE_URL` = the Internal Database URL, `NODE_VERSION` = `22`, plus the auth and email keys added in step 3.

`npm run db:deploy` (`prisma migrate deploy`) only applies new migrations. It never drops data.

## 3. First run
In the service's **Shell** tab, once:
```bash
SEED_OWNER_EMAIL=you@example.com npm run db:seed
```
This creates the Afrimetrica organisation and makes that email its owner.
