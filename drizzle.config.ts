import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./src/lib/config";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
