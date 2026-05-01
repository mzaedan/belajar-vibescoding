import { Elysia, t } from "elysia";
import {
  EmailAlreadyRegisteredError,
  getCurrentUserByToken,
  type GetCurrentUserFn,
  InvalidLoginError,
  loginUser,
  logoutUserByToken,
  type LogoutUserFn,
  type LoginUserFn,
  registerUser,
  type RegisterUserFn,
  UnauthorizedError,
} from "../services/users-service";

const registerUserBodySchema = t.Object({
  name: t.String({
    minLength: 1,
    description: "Nama user.",
    examples: ["Zaedan"],
  }),
  email: t.String({
    minLength: 1,
    description: "Email user yang akan dinormalisasi menjadi lowercase.",
    examples: ["zaedan@example.com"],
  }),
  password: t.String({
    minLength: 1,
    description: "Password user yang akan disimpan sebagai hash bcrypt.",
    examples: ["rahasia"],
  }),
});

const loginUserBodySchema = t.Object({
  name: t.String({
    minLength: 1,
    description: "Nama user.",
    examples: ["Zaedan"],
  }),
  email: t.String({
    minLength: 1,
    description: "Email user.",
    examples: ["zaedan@example.com"],
  }),
  password: t.String({
    minLength: 1,
    description: "Password user.",
    examples: ["rahasia"],
  }),
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
    logoutUserByToken?: LogoutUserFn;
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
      detail: {
        tags: ["Users"],
        summary: "Register user",
        description: "Membuat user baru dengan email unik dan password bcrypt.",
        responses: {
          201: {
            description: "User berhasil dibuat.",
          },
          400: {
            description: "Payload kosong, tidak lengkap, atau tidak valid.",
          },
          409: {
            description: "Email sudah terdaftar.",
          },
        },
      },
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
      detail: {
        tags: ["Users"],
        summary: "Login user",
        description: "Memvalidasi credential user dan membuat session token.",
        responses: {
          200: {
            description: "Login berhasil dan token session dikembalikan.",
          },
          400: {
            description: "Payload kosong, tidak lengkap, atau tidak valid.",
          },
          401: {
            description: "Email atau password salah.",
          },
        },
      },
    },
  );

  app.get(
    "/users/current",
    async ({ headers, set }) => {
      const token = parseBearerToken(headers.authorization);

      if (!token) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      try {
        const user = await (deps.getCurrentUserByToken ?? getCurrentUserByToken)(
          token,
        );

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
    },
    {
      detail: {
        tags: ["Users"],
        summary: "Get current user",
        description: "Mengambil data user aktif berdasarkan bearer token.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Data user aktif berhasil dikembalikan.",
          },
          401: {
            description: "Bearer token tidak ada, tidak valid, atau session tidak ditemukan.",
          },
        },
      },
    },
  );

  app.delete(
    "/users/logout",
    async ({ headers, set }) => {
      const token = parseBearerToken(headers.authorization);

      if (!token) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      try {
        await (deps.logoutUserByToken ?? logoutUserByToken)(token);

        set.status = 200;
        return { data: "OK" };
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          set.status = 401;
          return { error: error.message };
        }

        throw error;
      }
    },
    {
      detail: {
        tags: ["Users"],
        summary: "Logout user",
        description: "Menghapus session berdasarkan bearer token.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Logout berhasil dan session dihapus.",
          },
          401: {
            description: "Bearer token tidak ada, tidak valid, atau session tidak ditemukan.",
          },
        },
      },
    },
  );

  return app;
};
