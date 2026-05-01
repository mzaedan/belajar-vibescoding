import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { createApp } from "../src/app";
import { mysqlPool } from "../src/db/client";

const testEmails = [
  "register-success@example.test",
  "duplicate@example.test",
  "login-success@example.test",
  "login-flow@example.test",
  "current-user@example.test",
  "logout@example.test",
  "integration@example.test",
];

const cleanupUsers = async (emails = testEmails): Promise<void> => {
  const normalizedEmails = emails.map((email) => email.toLowerCase());
  const placeholders = normalizedEmails.map(() => "?").join(", ");

  await mysqlPool.execute(
    `DELETE sessions FROM sessions INNER JOIN users ON sessions.user_id = users.id WHERE users.email IN (${placeholders})`,
    normalizedEmails,
  );
  await mysqlPool.execute(
    `DELETE FROM users WHERE email IN (${placeholders})`,
    normalizedEmails,
  );
};

const app = createApp();

const jsonRequest = (url: string, method: string, payload: unknown): Request =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

const rawJsonRequest = (url: string, method: string, body: string): Request =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body,
  });

const registerRequest = (payload: unknown): Request =>
  jsonRequest("http://localhost/api/users", "POST", payload);

const loginRequest = (payload: unknown): Request =>
  jsonRequest("http://localhost/api/users/login", "POST", payload);

const currentUserRequest = (authorization?: string): Request =>
  new Request("http://localhost/api/users/current", {
    method: "GET",
    headers: authorization ? { authorization } : undefined,
  });

const logoutRequest = (authorization?: string): Request =>
  new Request("http://localhost/api/users/logout", {
    method: "DELETE",
    headers: authorization ? { authorization } : undefined,
  });

const registerUser = async (
  email: string,
  password = "rahasia",
  name = "Zaedan",
): Promise<Response> =>
  app.handle(
    registerRequest({
      name,
      email,
      password,
    }),
  );

const loginUser = async (
  email: string,
  password = "rahasia",
  name = "Zaedan",
): Promise<string> => {
  const response = await app.handle(
    loginRequest({
      name,
      email,
      password,
    }),
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(typeof body.data).toBe("string");

  return body.data;
};

beforeEach(async () => {
  await cleanupUsers();
});

afterAll(async () => {
  await cleanupUsers();
  await mysqlPool.end();
});

describe("users registration api", () => {
  it("registers a new user with valid payload", async () => {
    const response = await app.handle(
      registerRequest({
        name: "  Zaedan  ",
        email: "  REGISTER-SUCCESS@EXAMPLE.TEST  ",
        password: "rahasia",
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: "OK" });

    const [rows] = await mysqlPool.execute(
      "SELECT name, email, password FROM users WHERE email = ? LIMIT 1",
      ["register-success@example.test"],
    );
    const users = rows as Array<{ name: string; email: string; password: string }>;

    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("Zaedan");
    expect(users[0].email).toBe("register-success@example.test");
    expect(users[0].password).not.toBe("rahasia");
  });

  it("rejects duplicate email registration", async () => {
    await registerUser("duplicate@example.test");

    const response = await app.handle(
      registerRequest({
        name: "Duplicate",
        email: "duplicate@example.test",
        password: "rahasia",
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Email sudah terdaftar" });
  });

  it("rejects empty registration fields", async () => {
    const payloads = [
      { name: "", email: "register-success@example.test", password: "rahasia" },
      { name: "Zaedan", email: "", password: "rahasia" },
      { name: "Zaedan", email: "register-success@example.test", password: "" },
    ];

    for (const payload of payloads) {
      const response = await app.handle(registerRequest(payload));

      expect(response.status).toBe(400);
    }
  });

  it("rejects incomplete and invalid registration payloads", async () => {
    const incompleteResponse = await app.handle(
      registerRequest({
        name: "Zaedan",
        email: "register-success@example.test",
      }),
    );
    const wrongTypeResponse = await app.handle(
      registerRequest({
        name: "Zaedan",
        email: "register-success@example.test",
        password: 123,
      }),
    );
    const invalidJsonResponse = await app.handle(
      rawJsonRequest("http://localhost/api/users", "POST", "{"),
    );

    expect(incompleteResponse.status).toBe(400);
    expect(wrongTypeResponse.status).toBe(400);
    expect(invalidJsonResponse.status).toBe(400);
  });
});

describe("users login api", () => {
  it("returns a session token for valid credentials", async () => {
    await registerUser("login-success@example.test");

    const token = await loginUser("  LOGIN-SUCCESS@EXAMPLE.TEST  ");

    expect(token.length).toBeGreaterThan(0);

    const [rows] = await mysqlPool.execute(
      `SELECT sessions.token FROM sessions
       INNER JOIN users ON sessions.user_id = users.id
       WHERE users.email = ? AND sessions.token = ?
       LIMIT 1`,
      ["login-success@example.test", token],
    );

    expect(rows as Array<unknown>).toHaveLength(1);
  });

  it("rejects invalid email or password", async () => {
    await registerUser("login-success@example.test");

    const unknownEmailResponse = await app.handle(
      loginRequest({
        name: "Zaedan",
        email: "missing@example.test",
        password: "rahasia",
      }),
    );
    const wrongPasswordResponse = await app.handle(
      loginRequest({
        name: "Zaedan",
        email: "login-success@example.test",
        password: "salah",
      }),
    );

    expect(unknownEmailResponse.status).toBe(401);
    expect(await unknownEmailResponse.json()).toEqual({
      error: "Email atau password Salah",
    });
    expect(wrongPasswordResponse.status).toBe(401);
    expect(await wrongPasswordResponse.json()).toEqual({
      error: "Email atau password Salah",
    });
  });

  it("rejects empty login fields", async () => {
    const payloads = [
      { name: "", email: "login-success@example.test", password: "rahasia" },
      { name: "Zaedan", email: "", password: "rahasia" },
      { name: "Zaedan", email: "login-success@example.test", password: "" },
    ];

    for (const payload of payloads) {
      const response = await app.handle(loginRequest(payload));

      expect(response.status).toBe(400);
    }
  });

  it("rejects incomplete and invalid login payloads", async () => {
    const incompleteResponse = await app.handle(
      loginRequest({
        name: "Zaedan",
        email: "login-success@example.test",
      }),
    );
    const wrongTypeResponse = await app.handle(
      loginRequest({
        name: "Zaedan",
        email: "login-success@example.test",
        password: 123,
      }),
    );
    const invalidJsonResponse = await app.handle(
      rawJsonRequest("http://localhost/api/users/login", "POST", "{"),
    );

    expect(incompleteResponse.status).toBe(400);
    expect(wrongTypeResponse.status).toBe(400);
    expect(invalidJsonResponse.status).toBe(400);
  });
});

describe("current user api", () => {
  it("returns current user for a valid bearer token", async () => {
    await registerUser("current-user@example.test", "rahasia", "Current User");
    const token = await loginUser("current-user@example.test");

    const response = await app.handle(currentUserRequest(`Bearer ${token}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      name: "Current User",
      email: "current-user@example.test",
    });
    expect(body.data.id).toBeNumber();
    expect(body.data.created_at).toBeDefined();
    expect(body.data.password).toBeUndefined();
  });

  it("rejects missing, malformed, empty, and unknown tokens", async () => {
    const requests = [
      currentUserRequest(),
      currentUserRequest("Basic abc123"),
      currentUserRequest("Bearer"),
      currentUserRequest("Bearer    "),
      currentUserRequest("Bearer missing-token"),
    ];

    for (const request of requests) {
      const response = await app.handle(request);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    }
  });

  it("rejects a token after its session is deleted", async () => {
    await registerUser("current-user@example.test");
    const token = await loginUser("current-user@example.test");

    await app.handle(logoutRequest(`Bearer ${token}`));
    const response = await app.handle(currentUserRequest(`Bearer ${token}`));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});

describe("users logout api", () => {
  it("logs out a valid bearer token and deletes its session", async () => {
    await registerUser("logout@example.test");
    const token = await loginUser("logout@example.test");

    const response = await app.handle(logoutRequest(`Bearer ${token}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: "OK" });

    const [rows] = await mysqlPool.execute(
      "SELECT id FROM sessions WHERE token = ? LIMIT 1",
      [token],
    );

    expect(rows as Array<unknown>).toHaveLength(0);
  });

  it("rejects missing, malformed, empty, and unknown logout tokens", async () => {
    const requests = [
      logoutRequest(),
      logoutRequest("Basic abc123"),
      logoutRequest("Bearer"),
      logoutRequest("Bearer    "),
      logoutRequest("Bearer missing-token"),
    ];

    for (const request of requests) {
      const response = await app.handle(request);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    }
  });

  it("rejects logging out with the same token twice", async () => {
    await registerUser("logout@example.test");
    const token = await loginUser("logout@example.test");

    const firstResponse = await app.handle(logoutRequest(`Bearer ${token}`));
    const secondResponse = await app.handle(logoutRequest(`Bearer ${token}`));

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(401);
    expect(await secondResponse.json()).toEqual({ error: "Unauthorized" });
  });
});

describe("users api integration flows", () => {
  it("registers, logs in, reads current user, and logs out", async () => {
    const email = "integration@example.test";

    const registerResponse = await registerUser(email, "rahasia", "Integration");
    const token = await loginUser(email);
    const currentResponse = await app.handle(currentUserRequest(`Bearer ${token}`));
    const logoutResponse = await app.handle(logoutRequest(`Bearer ${token}`));
    const currentAfterLogoutResponse = await app.handle(
      currentUserRequest(`Bearer ${token}`),
    );

    expect(registerResponse.status).toBe(201);
    expect(currentResponse.status).toBe(200);
    expect((await currentResponse.json()).data.email).toBe(email);
    expect(logoutResponse.status).toBe(200);
    expect(currentAfterLogoutResponse.status).toBe(401);
  });

  it("can rerun duplicate-email scenario after cleanup", async () => {
    const email = "integration@example.test";

    await registerUser(email);
    const duplicateBeforeCleanup = await registerUser(email);

    await cleanupUsers([email]);

    const registerAfterCleanup = await registerUser(email);

    expect(duplicateBeforeCleanup.status).toBe(409);
    expect(registerAfterCleanup.status).toBe(201);
  });
});
