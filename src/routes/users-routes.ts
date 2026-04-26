import { Elysia, t } from "elysia";
import {
  EmailAlreadyRegisteredError,
  InvalidLoginError,
  loginUser,
  type LoginUserFn,
  registerUser,
  type RegisterUserFn,
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

export const createUsersRoutes = (
  deps: {
    registerUser?: RegisterUserFn;
    loginUser?: LoginUserFn;
  } = {},
): Elysia =>
  new Elysia()
    .post(
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
    )
    .post(
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
