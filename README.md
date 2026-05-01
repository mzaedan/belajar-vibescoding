# Bun + Elysia + Drizzle Template

Template backend dasar berbasis Bun, Elysia, Drizzle ORM, dan MySQL.
Project ini sengaja tidak terikat use case/domain tertentu supaya fleksibel dipakai ulang.

## Prerequisites

- Bun `>=1.3`
- Docker + Docker Compose

## Setup Lokal

1. Install dependency:

```bash
bun install
```

2. Salin env:

```bash
cp .env.example .env
```

3. Jalankan MySQL:

```bash
docker compose up -d
```

4. Jalankan server:

```bash
bun run dev
```

Server tersedia di `http://localhost:3000/api/v1`.

## Scripts

- `bun run dev` menjalankan server dengan watch mode.
- `bun run start` menjalankan server normal.
- `bun run test` menjalankan test endpoint dasar.
- `bun run db:generate` generate migrasi dari schema Drizzle.
- `bun run db:migrate` apply migrasi ke MySQL.

## Endpoint Template

- `GET /api/v1/health`

## Menambahkan Use Case Sendiri

1. Tambahkan table di `src/db/schema.ts`.
2. Jalankan `bun run db:generate`.
3. Jalankan `bun run db:migrate`.
4. Tambahkan route di `src/routes/` dan mount di `src/app.ts`.
