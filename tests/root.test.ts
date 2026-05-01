import { describe, expect, it } from "bun:test";
import { createApp } from "../src/app";

describe("root api", () => {
  it("returns service information under api prefix", async () => {
    const app = createApp();
    const response = await app.handle(new Request("http://localhost/api/"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        service: "api-template",
        version: "v1",
      },
      error: null,
      meta: {},
    });
  });

  it("does not expose root endpoint outside api prefix", async () => {
    const app = createApp();
    const response = await app.handle(new Request("http://localhost/"));

    expect(response.status).toBe(404);
  });
});
