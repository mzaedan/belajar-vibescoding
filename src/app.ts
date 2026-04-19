import { Elysia, t } from "elysia";
import { config } from "./lib/config";
import { failure, success } from "./lib/response";

export const createApp = (): Elysia =>
  new Elysia({ prefix: config.apiPrefix })
    .onError(({ code, error, set }) => {
      if (code === "VALIDATION") {
        set.status = 400;
        return failure("VALIDATION_ERROR", "Invalid request payload", {
          message: error.message,
        });
      }

      set.status = 500;
      return failure("INTERNAL_SERVER_ERROR", "Unexpected server error");
    })
    .get("/health", () => success({ status: "ok" }))
    .get("/", () => success({ service: "api-template", version: "v1" }), {
      detail: { hide: true },
      response: t.Any(),
    });
