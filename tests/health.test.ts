import { describe, expect, it } from "bun:test";
import { createApp } from "../src/app";

describe("api-template", () => {
  it("returns healthy status", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("http://localhost/api/v1/health"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.status).toBe("ok");
    expect(body.error).toBeNull();
  });
});
