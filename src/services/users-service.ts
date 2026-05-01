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

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("Email sudah terdaftar");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class InvalidLoginError extends Error {
  constructor() {
    super("Email atau password Salah");
    this.name = "InvalidLoginError";
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const isDuplicateKeyError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: string; errno?: number };
  return maybeError.code === "ER_DUP_ENTRY" || maybeError.errno === 1062;
};

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
