import { Elysia, t } from "elysia";
import {
  EmailAlreadyRegisteredError,
  getCurrentUserByToken,
  type GetCurrentUserFn,
  InvalidLoginError,
  loginUser,
  type LoginUserFn,
  registerUser,
  type RegisterUserFn,
  UnauthorizedError,
} from "../services/users-service";

const registerUserBodySchema = t.Object({
  name: t.String({ minLength: 1 }),
  email: t.String({ minLength: 1 }),
  password: t.String({ minLength: 1 }),
});

const loginUserBodySchema = t.Object({
  name: t.String({ minLength: 1 }),
  email: t.String({ minLength: 1 }),
  password: t.String({ minLength: 1 }),
});

const parseBearerToken = (authorization?: string): string | null => {
  if (!authorization) return null;

  const [scheme, ...rest] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer") return null;

  const token = rest.join(" ").trim();
  return token ? token : null;
};

export const createUsersRoutes = (
  deps: {
    registerUser?: RegisterUserFn;
    loginUser?: LoginUserFn;
    getCurrentUserByToken?: GetCurrentUserFn;
  } = {},
): Elysia => {
  const app = new Elysia();

  app.post(
    "/users",
    async ({ body, set }) => {
      const name = body.name.trim();
      const email = body.email.trim();
      const password = body.password;

      if (!name || !email || !password.trim()) {
        set.status = 400;
        return { error: "Invalid request payload" };
      }

      try {
        await (deps.registerUser ?? registerUser)({
          name,
          email,
          password,
        });

        set.status = 201;
        return { data: "OK" };
      } catch (error) {
        if (error instanceof EmailAlreadyRegisteredError) {
          set.status = 409;
          return { error: error.message };
        }

        throw error;
      }
    },
    {
      body: registerUserBodySchema,
    },
  );

  app.post(
    "/users/login",
    async ({ body, set }) => {
      const name = body.name.trim();
      const email = body.email.trim();
      const password = body.password.trim();

      if (!name || !email || !password) {
        set.status = 400;
        return { error: "Invalid request payload" };
      }

      try {
        const token = await (deps.loginUser ?? loginUser)({
          name,
          email,
          password,
        });

        set.status = 200;
        return { data: token };
      } catch (error) {
        if (error instanceof InvalidLoginError) {
          set.status = 401;
          return { error: error.message };
        }

        throw error;
      }
    },
    {
      body: loginUserBodySchema,
    },
  );

  app.get("/users/current", async ({ headers, set }) => {
    const token = parseBearerToken(headers.authorization);

    if (!token) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    try {
      const user = await (deps.getCurrentUserByToken ?? getCurrentUserByToken)(token);

      set.status = 200;
      return {
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: user.createdAt,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        set.status = 401;
        return { error: error.message };
      }

      throw error;
    }
  });

  return app;
};
