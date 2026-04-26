import { Elysia, t } from "elysia";
import {
  EmailAlreadyRegisteredError,
  registerUser,
  type RegisterUserFn,
} from "../services/users-service";

const registerUserBodySchema = t.Object({
  name: t.String({ minLength: 1 }),
  email: t.String({ minLength: 1 }),
  password: t.String({ minLength: 1 }),
});

export const createUsersRoutes = (
  registerUserHandler: RegisterUserFn = registerUser,
): Elysia =>
  new Elysia().post(
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
        await registerUserHandler({
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
