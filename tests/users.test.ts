import { describe, expect, it, mock } from "bun:test";
import { createApp } from "../src/app";
import {
  EmailAlreadyRegisteredError,
  type GetCurrentUserFn,
  InvalidLoginError,
  type LoginUserFn,
  type LoginUserInput,
  type RegisterUserFn,
  type RegisterUserInput,
  UnauthorizedError,
} from "../src/services/users-service";

const requestToRegister = (payload: unknown): Request =>
  new Request("http://localhost/api/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

const requestToLogin = (payload: unknown): Request =>
  new Request("http://localhost/api/users/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

const requestToCurrentUser = (authorization?: string): Request =>
  new Request("http://localhost/api/users/current", {
    method: "GET",
    headers: authorization ? { authorization } : undefined,
  });

describe("users registration", () => {
  it("registers a new user", async () => {
    let capturedInput: RegisterUserInput | null = null;

    const registerUserMock: RegisterUserFn = mock(async (input) => {
      capturedInput = input;
    });

    const app = createApp({ registerUser: registerUserMock });
    const response = await app.handle(
      requestToRegister({
        name: "  zaedan  ",
        email: "  ZAEDAN@GMAIL.COM  ",
        password: "rahasia",
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: "OK" });
    expect(capturedInput).toEqual({
      name: "zaedan",
      email: "ZAEDAN@GMAIL.COM",
      password: "rahasia",
    });
  });

  it("returns conflict for duplicate email", async () => {
    const registerUserMock: RegisterUserFn = mock(async () => {
      throw new EmailAlreadyRegisteredError();
    });

    const app = createApp({ registerUser: registerUserMock });
    const response = await app.handle(
      requestToRegister({
        name: "zaedan",
        email: "zaedan@gmail.com",
        password: "rahasia",
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Email sudah terdaftar" });
  });

  it("rejects invalid payload", async () => {
    const registerUserMock: RegisterUserFn = mock(async () => {});
    const app = createApp({ registerUser: registerUserMock });
    const response = await app.handle(
      requestToRegister({
        name: "",
        email: "zaedan@gmail.com",
        password: "rahasia",
      }),
    );

    expect(response.status).toBe(400);
  });
});

describe("users login", () => {
  it("returns token for valid credentials", async () => {
    let capturedInput: LoginUserInput | null = null;

    const loginUserMock: LoginUserFn = mock(async (input) => {
      capturedInput = input;
      return "generated-token";
    });

    const app = createApp({ loginUser: loginUserMock });
    const response = await app.handle(
      requestToLogin({
        name: "  zaedan  ",
        email: "  ZAEDAN@GMAIL.COM  ",
        password: "rahasia",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: "generated-token" });
    expect(capturedInput).toEqual({
      name: "zaedan",
      email: "ZAEDAN@GMAIL.COM",
      password: "rahasia",
    });
  });

  it("returns unauthorized for invalid email or password", async () => {
    const loginUserMock: LoginUserFn = mock(async () => {
      throw new InvalidLoginError();
    });

    const app = createApp({ loginUser: loginUserMock });
    const response = await app.handle(
      requestToLogin({
        name: "zaedan",
        email: "zaedan@gmail.com",
        password: "salah",
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Email atau password Salah" });
  });

  it("rejects invalid login payload", async () => {
    const loginUserMock: LoginUserFn = mock(async () => "generated-token");
    const app = createApp({ loginUser: loginUserMock });
    const response = await app.handle(
      requestToLogin({
        name: "",
        email: "zaedan@gmail.com",
        password: "rahasia",
      }),
    );

    expect(response.status).toBe(400);
  });
});

describe("current user", () => {
  it("returns current user for valid bearer token", async () => {
    let capturedToken: string | null = null;

    const getCurrentUserByTokenMock: GetCurrentUserFn = mock(async (token) => {
      capturedToken = token;
      return {
        id: 1,
        name: "zaedan",
        email: "zaedan@gmail.com",
        createdAt: "2026-04-26T12:34:56.000Z",
      };
    });

    const app = createApp({ getCurrentUserByToken: getCurrentUserByTokenMock });
    const response = await app.handle(requestToCurrentUser("Bearer test-token"));

    expect(response.status).toBe(200);
    expect(capturedToken).toBe("test-token");
    expect(await response.json()).toEqual({
      data: {
        id: 1,
        name: "zaedan",
        email: "zaedan@gmail.com",
        created_at: "2026-04-26T12:34:56.000Z",
      },
    });
  });

  it("returns unauthorized when authorization header is missing", async () => {
    const getCurrentUserByTokenMock: GetCurrentUserFn = mock(async () => {
      throw new Error("must not be called");
    });
    const app = createApp({ getCurrentUserByToken: getCurrentUserByTokenMock });
    const response = await app.handle(requestToCurrentUser());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns unauthorized for non-bearer authorization header", async () => {
    const getCurrentUserByTokenMock: GetCurrentUserFn = mock(async () => {
      throw new Error("must not be called");
    });
    const app = createApp({ getCurrentUserByToken: getCurrentUserByTokenMock });
    const response = await app.handle(requestToCurrentUser("Basic abc123"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns unauthorized for invalid token", async () => {
    const getCurrentUserByTokenMock: GetCurrentUserFn = mock(async () => {
      throw new UnauthorizedError();
    });

    const app = createApp({ getCurrentUserByToken: getCurrentUserByTokenMock });
    const response = await app.handle(requestToCurrentUser("Bearer invalid-token"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});
