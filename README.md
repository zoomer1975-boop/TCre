# T-Credit MVP

NextJS App Router prototype for Keimyung University's T-Credit contribution log workflow.

## Getting Started

```bash
npm install
npm run dev
```

The MVP runs without a database by default. When `DATABASE_URL` is not set, the app uses an in-memory repository seeded from mock data so contribution submission and approval actions can be tested immediately.

## PostgreSQL Mode

Copy `.env.example` to `.env`, update `DATABASE_URL`, then run:

```bash
npm run db:push
npm run db:seed
npm run dev
```

The repository layer automatically switches to Prisma/PostgreSQL when `DATABASE_URL` is present. School SSO and HR organization data are still represented by mock providers under `src/lib/providers`, which keeps those integrations replaceable.

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run db:generate
npm run db:push
npm run db:seed
```
