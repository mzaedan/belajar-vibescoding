# Bun Elysia Drizzle API

Backend REST API sederhana untuk autentikasi user. Aplikasi ini menyediakan endpoint untuk cek health service, informasi service, registrasi user, login, membaca user yang sedang aktif melalui bearer token, dan logout.

Project ini dibangun dengan Bun, Elysia, Drizzle ORM, dan MySQL. Struktur kode dibuat modular agar route, service, konfigurasi, helper response, dan database schema mudah dikembangkan.

## Technology Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **HTTP framework**: Elysia
- **ORM**: Drizzle ORM
- **Database**: MySQL 8
- **Database driver**: mysql2
- **Migration tool**: drizzle-kit
- **Testing**: Bun test
- **Local services**: Docker Compose
- **Database UI**: phpMyAdmin

## Library Utama

- `elysia`: framework HTTP untuk membuat API.
- `drizzle-orm`: ORM untuk query database secara typed.
- `mysql2`: driver koneksi MySQL.
- `drizzle-kit`: generate dan apply migration dari schema Drizzle.
- `typescript`: type system untuk project.
- `@types/bun`: type definition untuk Bun.

## Struktur Project

```text
.
├── drizzle/
│   ├── 0000_steep_scarlet_witch.sql
│   ├── 0001_familiar_imperial_guard.sql
│   └── meta/
├── src/
│   ├── app.ts
│   ├── index.ts
│   ├── db/
│   │   ├── client.ts
│   │   └── schema.ts
│   ├── lib/
│   │   ├── config.ts
│   │   └── response.ts
│   ├── routes/
│   │   └── users-routes.ts
│   └── services/
│       └── users-service.ts
├── tests/
│   ├── health.test.ts
│   ├── root.test.ts
│   └── users.test.ts
├── docker-compose.yml
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

## Arsitektur dan Penamaan File

- `src/index.ts`: entry point aplikasi. File ini membuat instance app dan menjalankan server berdasarkan konfigurasi.
- `src/app.ts`: factory utama Elysia app. Di sini API prefix, global error handler, root endpoint, health endpoint, dan route module digabungkan.
- `src/routes/*-routes.ts`: layer HTTP route. File route bertanggung jawab membaca request, validasi payload dengan Elysia schema, parsing header, menentukan status code, dan memanggil service.
- `src/services/*-service.ts`: layer business logic. File service berisi operasi domain seperti register, login, validasi token session, dan logout.
- `src/db/client.ts`: konfigurasi koneksi MySQL pool dan instance Drizzle.
- `src/db/schema.ts`: definisi table database Drizzle.
- `src/lib/config.ts`: pembacaan environment variable dan default config aplikasi.
- `src/lib/response.ts`: helper response envelope untuk format sukses dan error.
- `tests/*.test.ts`: test endpoint dan flow API memakai `bun:test`.
- `drizzle/*.sql`: migration SQL yang dihasilkan oleh drizzle-kit.

Konvensi penamaan yang dipakai:

- Route module memakai suffix `-routes.ts`, contoh `users-routes.ts`.
- Service module memakai suffix `-service.ts`, contoh `users-service.ts`.
- Test file memakai suffix `.test.ts`, contoh `users.test.ts`.
- Database schema diletakkan terpusat di `src/db/schema.ts`.

## Environment Variable

Contoh konfigurasi tersedia di `.env.example`.

```env
APP_PORT=3000
API_PREFIX=/api

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=my-secret-pw
MYSQL_DATABASE=mydb
```

Default API base URL lokal:

```text
http://localhost:3000/api
```

## Database Schema

Schema utama didefinisikan di `src/db/schema.ts` dan migration SQL berada di folder `drizzle/`.

### `users`

| Column | Type | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `int` | Primary key, auto increment | ID user |
| `name` | `varchar(255)` | Not null | Nama user |
| `email` | `varchar(255)` | Not null, unique | Email user, dinormalisasi menjadi lowercase |
| `password` | `varchar(255)` | Not null | Password yang sudah di-hash dengan bcrypt |
| `created_at` | `timestamp` | Not null, default `now()` | Waktu user dibuat |

Index:

- `users_email_unique` pada column `email`.

### `sessions`

| Column | Type | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `int` | Primary key, auto increment | ID session |
| `token` | `varchar(255)` | Not null, unique | Session token dari `crypto.randomUUID()` |
| `user_id` | `int` | Not null, foreign key ke `users.id` | Pemilik session |
| `created_at` | `timestamp` | Not null, default `now()` | Waktu session dibuat |

Index dan relation:

- `sessions_token_unique` pada column `token`.
- `sessions.user_id` reference ke `users.id`.

## API yang Tersedia

Semua endpoint berada di bawah prefix dari `API_PREFIX`, default-nya `/api`.

### `GET /api/`

Mengembalikan informasi service.

Response `200`:

```json
{
  "data": {
    "service": "api-template",
    "version": "v1"
  },
  "error": null,
  "meta": {}
}
```

### `GET /api/health`

Mengecek status service.

Response `200`:

```json
{
  "data": {
    "status": "ok"
  },
  "error": null,
  "meta": {}
}
```

### `POST /api/users`

Registrasi user baru.

Request body:

```json
{
  "name": "Zaedan",
  "email": "zaedan@example.com",
  "password": "rahasia"
}
```

Response `201`:

```json
{
  "data": "OK"
}
```

Kemungkinan error:

- `400`: payload kosong, tidak lengkap, atau tipe data tidak valid.
- `409`: email sudah terdaftar.

### `POST /api/users/login`

Login user dan membuat session token.

Request body:

```json
{
  "name": "Zaedan",
  "email": "zaedan@example.com",
  "password": "rahasia"
}
```

Response `200`:

```json
{
  "data": "session-token"
}
```

Kemungkinan error:

- `400`: payload kosong, tidak lengkap, atau tipe data tidak valid.
- `401`: email atau password salah.

### `GET /api/users/current`

Mengambil data user aktif berdasarkan bearer token.

Header:

```text
Authorization: Bearer session-token
```

Response `200`:

```json
{
  "data": {
    "id": 1,
    "name": "Zaedan",
    "email": "zaedan@example.com",
    "created_at": "2026-05-01T03:00:00.000Z"
  }
}
```

Kemungkinan error:

- `401`: token tidak ada, format authorization salah, token kosong, atau session tidak ditemukan.

### `DELETE /api/users/logout`

Logout user dengan menghapus session token.

Header:

```text
Authorization: Bearer session-token
```

Response `200`:

```json
{
  "data": "OK"
}
```

Kemungkinan error:

- `401`: token tidak ada, format authorization salah, token kosong, atau session tidak ditemukan.

## Setup Project

### 1. Install dependency

```bash
bun install
```

### 2. Salin environment file

```bash
cp .env.example .env
```

Di Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. Jalankan MySQL dan phpMyAdmin

```bash
docker compose up -d
```

Service yang dijalankan:

- MySQL: `localhost:3306`
- phpMyAdmin: `http://localhost:8080`

### 4. Jalankan migration

```bash
bun run db:migrate
```

Jika mengubah `src/db/schema.ts`, generate migration baru terlebih dahulu:

```bash
bun run db:generate
```

Lalu apply migration:

```bash
bun run db:migrate
```

## Cara Run Aplikasi

Development mode dengan watch:

```bash
bun run dev
```

Production-style run lokal:

```bash
bun run start
```

Server akan berjalan di:

```text
http://localhost:3000/api
```

## Cara Test Aplikasi

Pastikan MySQL sudah berjalan dan migration sudah diterapkan, karena test user memakai database.

```bash
docker compose up -d
bun run db:migrate
bun run test
```

Test yang tersedia:

- `tests/health.test.ts`: test endpoint health.
- `tests/root.test.ts`: test root endpoint di bawah API prefix.
- `tests/users.test.ts`: test registrasi, duplicate email, login, current user, logout, dan integration flow.

## Scripts

| Script | Fungsi |
| --- | --- |
| `bun run dev` | Menjalankan server dengan watch mode |
| `bun run start` | Menjalankan server normal |
| `bun run test` | Menjalankan test suite |
| `bun run db:generate` | Generate migration dari schema Drizzle |
| `bun run db:migrate` | Apply migration ke MySQL |

## Contoh Request

Register:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Zaedan","email":"zaedan@example.com","password":"rahasia"}'
```

Login:

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"name":"Zaedan","email":"zaedan@example.com","password":"rahasia"}'
```

Current user:

```bash
curl http://localhost:3000/api/users/current \
  -H "Authorization: Bearer session-token"
```

Logout:

```bash
curl -X DELETE http://localhost:3000/api/users/logout \
  -H "Authorization: Bearer session-token"
```
