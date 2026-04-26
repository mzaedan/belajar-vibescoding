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
