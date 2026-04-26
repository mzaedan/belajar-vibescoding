import { describe, expect, it, mock } from "bun:test";
import { createApp } from "../src/app";
import {
  EmailAlreadyRegisteredError,
  InvalidLoginError,
  type LoginUserFn,
  type LoginUserInput,
  type RegisterUserFn,
  type RegisterUserInput,
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
