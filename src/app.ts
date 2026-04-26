import { Elysia, t } from "elysia";
import { config } from "./lib/config";
import { failure, success } from "./lib/response";
import { createUsersRoutes } from "./routes/users-routes";
import {
  loginUser,
  registerUser,
  type LoginUserFn,
  type RegisterUserFn,
} from "./services/users-service";

type CreateAppDeps = {
  registerUser?: RegisterUserFn;
  loginUser?: LoginUserFn;
};

export const createApp = (deps: CreateAppDeps = {}): Elysia =>
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
    })
    .use(
      createUsersRoutes({
        registerUser: deps.registerUser ?? registerUser,
        loginUser: deps.loginUser ?? loginUser,
      }),
    );
