import { describe, expect, it } from "bun:test";
import { createApp } from "../src/app";

describe("api-template", () => {
  it("returns healthy status", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("http://localhost/api/health"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.status).toBe("ok");
    expect(body.error).toBeNull();
  });

  it("does not allow unsupported method for health endpoint", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("http://localhost/api/health", { method: "POST" }),
    );

    expect(response.status).toBe(404);
  });
});
