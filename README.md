# Relicase API

The Relicase API is a NestJS and Express REST service backed by PostgreSQL through Prisma. It provides JWT authentication, catalogue and category management, persistent carts, atomic simulated checkout, order history, and role-protected administration for the [Relicase storefront](https://relicase.pages.dev).

- Live API: [api.relicase.eriduops.com](https://api.relicase.eriduops.com)
- Swagger UI: [api.relicase.eriduops.com/api](https://api.relicase.eriduops.com/api)
- Frontend repository: [github.com/frsardhf/relicase](https://github.com/frsardhf/relicase)

## Description

The service covers the original e-commerce assignment while treating checkout as a clearly disclosed portfolio simulation:

- Signup and login with hashed passwords and signed JWTs
- User-owned profile, cart, and order access
- Guest product browsing with pagination and keyword search
- Admin-only product, category, order-status, user, and role operations
- Server-calculated totals and historical product snapshots on order items
- Transactional stock updates and idempotent order confirmation
- Validated request DTOs with unknown fields rejected globally
- Exact production/development CORS origins plus controlled Cloudflare Pages previews

No payment provider is connected. Use fictitious profile and checkout details in the public demo.

## Project setup

Requirements:

- Node.js 20
- npm
- PostgreSQL 16

Install dependencies and configure the application:

```bash
npm ci
cp .env.example .env
```

Set both Prisma URLs to your PostgreSQL database, replace `JWT_SECRET_KEY`, and list the permitted frontend origins. Then apply migrations and load the reproducible catalogue fixture:

```bash
npm run migrate:deploy
npm run seed
```

## Compile and run the project

```bash
# watch mode
npm run start:dev

# production build
npm run build
npm run start:prod
```

The API listens on port `3000` by default. Swagger is served at `/api`.

## Run tests

```bash
# lint and unit tests
npm run lint
npm test -- --runInBand

# HTTP authorization and workflow tests
npm run test:e2e

# PostgreSQL-backed migration, catalogue, stock, and checkout tests
npm run test:integration

# production compile
npm run build
```

Integration tests require a disposable PostgreSQL database in `POSTGRES_PRISMA_URL`. GitHub Actions provisions PostgreSQL 16, applies the migrations, and runs all of these checks.

## Catalogue data

The checked-in fixture contains 24 Blue Archive merchandise variants selected from the public Good Smile US collection feed on 2026-10-07. It records the original product and variant identifiers, USD prices, vendor/category metadata, source URLs, and source update timestamps.

```bash
# Import the checked-in snapshot without overwriting local stock/admin edits
npm run catalogue:import

# Fetch and normalize the current upstream feed
npm run catalogue:import:live

# Deliberately reset deterministic demo stock while importing
npm run catalogue:reset-stock
```

Imports are idempotent by source provider and variant ID. Upstream failures do not replace the last usable local catalogue. Source image rights were not verified, so the storefront uses local category artwork instead of republishing source images.

## Deployment

Production runs on a VPS as two private Docker services plus a one-shot migration service:

- PostgreSQL 16 persists to the `postgres_data` volume and is not published to the host.
- The API runs as the non-root Node user and binds only to `127.0.0.1:3000`.
- Nginx terminates HTTPS for `api.relicase.eriduops.com` and proxies to the local API port.

Create the production environment file, using unique random values for the database password and JWT secret:

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production -f compose.production.yml up -d --build
docker compose --env-file .env.production -f compose.production.yml run --rm migrate npm run seed
```

The Compose startup order waits for PostgreSQL, applies all Prisma migrations, and starts the API only after migration succeeds. `deploy/nginx.conf` is the versioned reverse-proxy template. Keep `.env.production` only on the server.

Useful operational checks:

```bash
docker compose --env-file .env.production -f compose.production.yml ps
docker compose --env-file .env.production -f compose.production.yml logs --tail=100 api
curl -fsS https://api.relicase.eriduops.com/products?page=1\&limit=3
```

## Resources

- [NestJS documentation](https://docs.nestjs.com)
- [Prisma migrations](https://www.prisma.io/docs/orm/prisma-migrate)
- [Cloudflare Pages frontend](https://relicase.pages.dev)
- [Good Smile US source collection](https://www.goodsmileus.com/collections/blue-archive)

## License

This repository was created as a candidate-evaluation and portfolio project. Third-party product names and metadata remain the property of their respective owners.
