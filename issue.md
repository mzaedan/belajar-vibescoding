# Issue: Implement Session Auth, Current User, dan Logout

## Ringkasan
Buat fitur autentikasi berbasis session token untuk user yang login.

Fitur yang harus tersedia:
1. Tabel `sessions` untuk menyimpan token login.
2. Login membuat token UUID dan menyimpannya ke tabel `sessions`.
3. API untuk mengambil user yang sedang login.
4. API logout untuk menghapus session berdasarkan token.

Dokumen ini dibuat sebagai panduan implementasi untuk junior programmer atau AI model yang lebih murah, jadi setiap tahap dibuat berurutan dan eksplisit.

## Struktur Folder yang Harus Diikuti
Di dalam folder `src`:
- `routes`: berisi routing ElysiaJS.
- `services`: berisi logic bisnis aplikasi.

Format nama file:
- Route: `*-routes.ts`, contoh `users-routes.ts`.
- Service: `*-service.ts`, contoh `users-service.ts`.

## Requirement Database

### Tabel `sessions`
Buat tabel baru bernama `sessions` dengan kolom berikut:

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | integer | auto increment, primary key |
| `token` | varchar(255) | not null, berisi UUID token user yang login |
| `user_id` | integer | foreign key ke tabel `users.id` |
| `created_at` | timestamp | default `current_timestamp` |

Catatan penting:
- `token` sebaiknya dibuat unique supaya satu token tidak bisa memiliki lebih dari satu session.
- `user_id` harus mengarah ke tabel `users`.
- Token yang dipakai untuk current user dan logout adalah token session yang tersimpan di tabel `sessions`.

## Requirement API

### 1. Login
Gunakan endpoint login yang sudah ada atau buat jika belum tersedia:

```http
POST /api/users/login
```

Behavior:
1. Validasi credential user.
2. Jika credential benar, generate token menggunakan UUID.
3. Simpan token tersebut ke tabel `sessions` dengan `user_id` milik user.
4. Return token ke client.

Contoh response sukses:

```json
{
  "data": "uuid-token"
}
```

### 2. Get Current User
Buat API untuk mengambil user yang sedang login:

```http
GET /api/users/current
```

Headers:

```http
Authorization: Bearer <token>
```

Behavior:
1. Ambil token dari header `Authorization`.
2. Header harus memakai format `Bearer <token>`.
3. Cari token tersebut di tabel `sessions`.
4. Jika token valid, ambil data user dari tabel `users`.
5. Jangan return password.

Contoh response sukses:

```json
{
  "data": {
    "id": 1,
    "name": "zaedan",
    "email": "zaedan@gmail.com",
    "created_at": "2026-04-26T12:34:56.000Z"
  }
}
```

Contoh response error:

```json
{
  "error": "Unauthorized"
}
```

### 3. Logout
Buat endpoint:

```http
DELETE /api/users/logout
```

Headers:

```http
Authorization: Bearer <token>
```

Response body sukses:

```json
{
  "data": "OK"
}
```

Behavior sukses:
1. Ambil token dari header `Authorization`.
2. Header harus memakai format `Bearer <token>`.
3. Cari session dengan token tersebut di tabel `sessions`.
4. Jika session ditemukan, hapus row session tersebut.
5. Return response `{ "data": "OK" }`.

Response body error:

```json
{
  "error": "Unauthorized"
}
```

Kondisi yang harus menghasilkan `Unauthorized`:
- Header `Authorization` tidak ada.
- Format header bukan `Bearer <token>`.
- Token kosong.
- Token tidak ditemukan di tabel `sessions`.

## Tahapan Implementasi

### Tahap 1 - Cek Kondisi Awal Project
File yang perlu dicek:
- `src/db/schema.ts`
- `src/routes/users-routes.ts`
- `src/services/users-service.ts`
- `src/app.ts`
- `tests/users.test.ts`

Yang harus dipahami:
1. Bagaimana tabel `users` didefinisikan.
2. Bagaimana route user dibuat.
3. Bagaimana service user dipanggil dari route.
4. Apakah project memakai prefix `/api` dari konfigurasi aplikasi.

### Tahap 2 - Tambahkan Schema `sessions`
File target:
- `src/db/schema.ts`

Langkah:
1. Import helper Drizzle yang dibutuhkan, misalnya `mysqlTable`, `int`, `varchar`, `timestamp`, dan `uniqueIndex`.
2. Tambahkan table `sessions`.
3. Kolom `user_id` harus reference ke `users.id`.
4. Kolom `created_at` memakai default current timestamp.
5. Tambahkan unique index untuk `token`.

Checklist:
- `sessions.id` adalah primary key auto increment.
- `sessions.token` adalah `varchar(255)` dan `not null`.
- `sessions.user_id` tersambung ke `users.id`.
- `sessions.created_at` otomatis terisi.

### Tahap 3 - Generate dan Jalankan Migration
Command yang kemungkinan dipakai:

```bash
bun run db:generate
bun run db:migrate
```

Langkah:
1. Generate migration baru setelah schema berubah.
2. Review file migration yang dibuat di folder `drizzle`.
3. Jalankan migration ke database.
4. Pastikan tabel `sessions` benar-benar ada.

Checklist:
- Migration membuat tabel `sessions`.
- Foreign key ke `users.id` terbentuk.
- Unique index token terbentuk.

### Tahap 4 - Update Login Service
File target:
- `src/services/users-service.ts`

Langkah:
1. Setelah credential login valid, buat token dengan `crypto.randomUUID()`.
2. Insert token dan `user_id` ke tabel `sessions`.
3. Return token dari service login.

Hal yang harus dihindari:
- Jangan menyimpan password plaintext.
- Jangan membuat token dari email atau data mudah ditebak.
- Jangan return data password.

### Tahap 5 - Buat Service Current User
File target:
- `src/services/users-service.ts`

Nama fungsi yang disarankan:
- `getCurrentUserByToken(token)`

Alur:
1. Trim token.
2. Jika token kosong, throw error `Unauthorized`.
3. Cari token di tabel `sessions`.
4. Join ke tabel `users` berdasarkan `sessions.user_id`.
5. Jika tidak ditemukan, throw error `Unauthorized`.
6. Return data user tanpa password.

Data user yang boleh dikembalikan:
- `id`
- `name`
- `email`
- `created_at`

### Tahap 6 - Buat Service Logout
File target:
- `src/services/users-service.ts`

Nama fungsi yang disarankan:
- `logoutUserByToken(token)`

Alur:
1. Trim token.
2. Jika token kosong, throw error `Unauthorized`.
3. Cari session berdasarkan token.
4. Jika session tidak ditemukan, throw error `Unauthorized`.
5. Hapus session dengan token tersebut dari tabel `sessions`.
6. Return tanpa data, atau return `"OK"` sesuai kebutuhan route.

Catatan:
- Jangan langsung return sukses jika token tidak ditemukan.
- Requirement meminta token tidak valid menghasilkan `{ "error": "Unauthorized" }`.

### Tahap 7 - Parsing Header Authorization
File target:
- `src/routes/users-routes.ts`

Buat helper kecil, contoh nama:
- `parseBearerToken(authorization)`

Aturan parsing:
1. Jika header kosong, return `null`.
2. Split header berdasarkan spasi.
3. Scheme harus `Bearer`.
4. Token tidak boleh kosong.
5. Return token jika valid.

Contoh valid:

```http
Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000
```

Contoh invalid:

```http
Authorization: Basic abc
Authorization: Bearer
Authorization: token-saja
```

### Tahap 8 - Tambahkan Route Current User
File target:
- `src/routes/users-routes.ts`

Route internal:

```http
GET /users/current
```

Karena app memakai prefix `/api`, endpoint publiknya menjadi:

```http
GET /api/users/current
```

Langkah:
1. Ambil header `authorization`.
2. Parse token dengan helper Bearer.
3. Jika token invalid, return status 401.
4. Panggil service `getCurrentUserByToken`.
5. Jika sukses, return data user.
6. Jika service throw `Unauthorized`, return status 401.

### Tahap 9 - Tambahkan Route Logout
File target:
- `src/routes/users-routes.ts`

Route internal:

```http
DELETE /users/logout
```

Karena app memakai prefix `/api`, endpoint publiknya menjadi:

```http
DELETE /api/users/logout
```

Langkah:
1. Ambil header `authorization`.
2. Parse token dengan helper Bearer.
3. Jika token invalid, return status 401 dan body `{ "error": "Unauthorized" }`.
4. Panggil service `logoutUserByToken`.
5. Jika sukses, return status 200 dan body `{ "data": "OK" }`.
6. Jika service throw `Unauthorized`, return status 401 dan body `{ "error": "Unauthorized" }`.

### Tahap 10 - Wire Dependency di App
File target:
- `src/app.ts`

Langkah:
1. Jika project memakai dependency injection untuk testing, tambahkan dependency logout.
2. Pastikan `createUsersRoutes` menerima service logout.
3. Pastikan endpoint lama seperti register dan login tidak rusak.

### Tahap 11 - Tambahkan Test
File target:
- `tests/users.test.ts`

Minimal test login:
1. Login sukses return token.
2. Login sukses memanggil service yang menyimpan session.

Minimal test current user:
1. Header Bearer token valid return user.
2. Header kosong return 401.
3. Format header salah return 401.
4. Token tidak ditemukan return 401.

Minimal test logout:
1. Logout dengan token valid return 200 `{ "data": "OK" }`.
2. Logout tanpa header return 401 `{ "error": "Unauthorized" }`.
3. Logout dengan format header salah return 401.
4. Logout dengan token tidak ditemukan return 401.
5. Pastikan service logout menerima token yang benar dari header.

## Acceptance Criteria
Fitur dianggap selesai jika:
1. Tabel `sessions` ada dengan kolom sesuai requirement.
2. Login membuat UUID token dan menyimpannya ke `sessions`.
3. `GET /api/users/current` bisa mengambil user berdasarkan token session.
4. `DELETE /api/users/logout` bisa menghapus session berdasarkan token.
5. Logout sukses mengembalikan:

```json
{
  "data": "OK"
}
```

6. Unauthorized mengembalikan:

```json
{
  "error": "Unauthorized"
}
```

7. Password tidak pernah muncul di response.
8. Test untuk success dan error cases lulus.

## Risiko yang Harus Diwaspadai
1. Salah sumber token: validasi harus memakai tabel `sessions`, bukan password atau data lain dari tabel `users`.
2. Session tidak terhapus saat logout: pastikan row dengan token tersebut benar-benar dihapus.
3. Logout token invalid jangan dianggap sukses, karena requirement meminta `Unauthorized`.
4. Jangan return password di endpoint current user.
5. Jangan merusak endpoint register dan login yang sudah ada.

## Urutan Commit yang Disarankan
1. Commit 1: tambah schema `sessions` dan migration.
2. Commit 2: update login agar membuat session token.
3. Commit 3: tambah service dan route current user.
4. Commit 4: tambah service dan route logout.
5. Commit 5: tambah test lengkap untuk login, current user, dan logout.
