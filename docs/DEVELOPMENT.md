# BenchCRM Developer Guide

## Prerequisites
- Node.js 18+
- pnpm 9
- Docker (for Postgres + Redis)

## Initial Setup
```bash
cp .env.example .env
pnpm install
pnpm -r generate
```

## Local Services
```bash
docker-compose up -d postgres redis
pnpm --filter prisma migrate:dev
pnpm --filter prisma seed
```

## Running Applications
```bash
pnpm dev:api   # http://localhost:4000
pnpm dev:web   # http://localhost:3000
```

## Key Packages
- `apps/api` – NestJS modular monolith API
- `apps/web` – Next.js 14 App Router frontend
- `packages/prisma` – Prisma schema, migrations, and seed data

## Testing
```bash
pnpm --filter api test
pnpm --filter web test
```

## Useful Commands
- `pnpm --filter prisma migrate` – apply migrations in CI
- `pnpm --filter api lint` – lint backend
- `pnpm --filter web lint` – lint frontend
