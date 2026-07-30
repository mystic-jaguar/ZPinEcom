# ZPIN Customer app (`ZPinEcom`)

React Native (Expo Router) shopping app for ZPIN **customers**, plus its TypeScript
Node/Express backend.

One of three ZPIN apps. All three share the `zpin_ecommerce` Postgres database:

| App | Repo | Backend port | Public API |
|---|---|---|---|
| Customer (this repo) | `ZPinEcom` | 5002 | `https://ecom-api.zpinservices.com/api/v1/` |
| Seller | `ZPinVendorApp` | 5007 | `https://app-api.zpinshop.com/api/v1/` |
| Delivery partner | `Z-PinApp` | 5006 | `https://delivery-api.zpinservices.com/api/v1/` |

Routes are mounted under **`/api/v1/...`**. A cart spanning several sellers splits into one
order per seller, grouped under a single order number via `orders.group_id`. This backend is
the only writer of `orders.payment_status = 'paid'` (Razorpay verification) — the paid signal
the other two apps trust.

## Layout

```
backend/
  src/index.ts     app entry
  src/db.ts        pool (30s statement_timeout)
  src/routes/      handlers
  src/middleware/  auth (JWT + token revocation), rate limits
  src/utils/       logger, redis
  src/scripts/     one-off CLI scripts (migrations, backfills)
  src/tests/       jest
frontend/          Expo Router app (TypeScript)
docs/, _archive/   local-only notes (gitignored)
```

## Backend

```bash
cd backend && npm install
cp .env.example .env      # then fill it in
npm run dev               # ts-node-dev
npm test                  # jest
npm run build             # tsc → dist/  (production runs dist/index.js)
```

Required env: `DATABASE_URL` (or `DB_*`), `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, `SMTP_*`
(email OTP; ZPIN sends no SMS), `CLOUDINARY_*`, `RAZORPAY_*`, `REDIS_*`.

Health: `/health`.

## Frontend

```bash
cd frontend && npm install
npx expo start
```

## Deploy

The backend runs as the Docker container `zpin-ecom` (`--network host`, port 5002). Its
Dockerfile is multi-stage and runs `tsc` inside the build, so **no local build step is needed**
— but the container serves `dist/`, so a change that doesn't compile will fail the build rather
than the runtime. The box has a git checkout:

```bash
ssh jay@195.35.20.40 'cd ~/zpin-app-ecom && git pull --ff-only origin master && cd backend && \
  docker build -t zpin-ecom:new . && docker rename zpin-ecom zpin-ecom-prev && docker stop zpin-ecom-prev && \
  docker run -d --name zpin-ecom --network host --env-file .env --restart unless-stopped \
    --log-opt max-size=10m --log-opt max-file=3 zpin-ecom:new && sleep 3 && curl -s localhost:5002/health'
```

Verify `https://ecom-api.zpinservices.com/health`, then drop the old container and tag the
image:

```bash
ssh jay@195.35.20.40 'docker rm zpin-ecom-prev && docker tag zpin-ecom:new zpin-ecom:staged'
```

To roll back at any point **before** dropping `-prev`:

```bash
ssh jay@195.35.20.40 'docker stop zpin-ecom && docker rm zpin-ecom && docker rename zpin-ecom-prev zpin-ecom && docker start zpin-ecom'
```

nginx is never changed by a deploy. Logs are JSON lines in production
(`docker logs zpin-ecom`).
