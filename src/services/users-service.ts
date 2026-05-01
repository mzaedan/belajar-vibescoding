import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { sessions, users } from "../db/schema";

export type RegisterUserInput = {
  name: string;
  email: string;
  password: string;
};

export type RegisterUserFn = (input: RegisterUserInput) => Promise<void>;

export type LoginUserInput = {
  name: string;
  email: string;
  password: string;
};

export type LoginUserFn = (input: LoginUserInput) => Promise<string>;

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  createdAt: Date | string;
};

export type GetCurrentUserFn = (token: string) => Promise<CurrentUser>;

export type LogoutUserFn = (token: string) => Promise<void>;

/** Error khusus saat email yang dipakai register sudah ada di database. */
export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("Email sudah terdaftar");
    this.name = "EmailAlreadyRegisteredError";
  }
}

/** Error khusus saat kombinasi email dan password tidak valid. */
export class InvalidLoginError extends Error {
  constructor() {
    super("Email atau password Salah");
    this.name = "InvalidLoginError";
  }
}

/** Error khusus saat token session tidak valid atau tidak ditemukan. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Merapikan email agar comparison dan penyimpanan selalu konsisten. */
const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Mengecek apakah error database berasal dari pelanggaran unique constraint. */
const isDuplicateKeyError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: string; errno?: number };
  return maybeError.code === "ER_DUP_ENTRY" || maybeError.errno === 1062;
};

/** Membuat user baru, melakukan hash password, dan menolak email duplikat. */
export const registerUser: RegisterUserFn = async (input) => {
  const email = normalizeEmail(input.email);

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new EmailAlreadyRegisteredError();
  }

  const hashedPassword = await Bun.password.hash(input.password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  try {
    await db.insert(users).values({
      name: input.name.trim(),
      email,
      password: hashedPassword,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new EmailAlreadyRegisteredError();
    }

    throw error;
  }
};

/** Memvalidasi credential user, membuat session baru, lalu mengembalikan token. */
export const loginUser: LoginUserFn = async (input) => {
  const email = normalizeEmail(input.email);

  const existingUser = await db
    .select({ id: users.id, password: users.password })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length === 0) {
    throw new InvalidLoginError();
  }

  const user = existingUser[0];
  const isPasswordValid = await Bun.password.verify(input.password, user.password);

  if (!isPasswordValid) {
    throw new InvalidLoginError();
  }

  const token = crypto.randomUUID();

  await db.insert(sessions).values({
    token,
    userId: user.id,
  });

  return token;
};

/** Mengambil data user aktif berdasarkan token session yang dikirim client. */
export const getCurrentUserByToken: GetCurrentUserFn = async (token) => {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new UnauthorizedError();
  }

  const userBySession = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, normalizedToken))
    .limit(1);

  if (userBySession.length === 0) {
    throw new UnauthorizedError();
  }

  return userBySession[0];
};

/** Menghapus session berdasarkan token agar user dianggap logout. */
export const logoutUserByToken: LogoutUserFn = async (token) => {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new UnauthorizedError();
  }

  const existingSession = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.token, normalizedToken))
    .limit(1);

  if (existingSession.length === 0) {
    throw new UnauthorizedError();
  }

  await db.delete(sessions).where(eq(sessions.token, normalizedToken));
};
