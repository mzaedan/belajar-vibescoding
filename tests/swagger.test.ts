import { describe, expect, it } from "bun:test";
import { createApp } from "../src/app";

describe("swagger documentation", () => {
  it("exposes swagger ui under api prefix", async () => {
    const app = createApp();
    const response = await app.handle(new Request("http://localhost/api/swagger"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  it("exposes openapi json with current api paths", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("http://localhost/api/swagger/json"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.paths["/api/"]).toBeDefined();
    expect(body.paths["/api/health"]).toBeDefined();
    expect(body.paths["/api/users"]).toBeDefined();
    expect(body.paths["/api/users/login"]).toBeDefined();
    expect(body.paths["/api/users/current"]).toBeDefined();
    expect(body.paths["/api/users/logout"]).toBeDefined();
    expect(body.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
  });
});
