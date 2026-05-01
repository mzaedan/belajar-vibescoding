type Config = {
  appPort: number;
  apiPrefix: string;
  mysqlHost: string;
  mysqlPort: number;
  mysqlUser: string;
  mysqlPassword: string;
  mysqlDatabase: string;
};

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config: Config = {
  appPort: toNumber(Bun.env.APP_PORT, 3000),
  apiPrefix: Bun.env.API_PREFIX ?? "/api",
  mysqlHost: Bun.env.MYSQL_HOST ?? "127.0.0.1",
  mysqlPort: toNumber(Bun.env.MYSQL_PORT, 3306),
  mysqlUser: Bun.env.MYSQL_USER ?? "root",
  mysqlPassword: Bun.env.MYSQL_PASSWORD ?? "my-secret-pw",
  mysqlDatabase: Bun.env.MYSQL_DATABASE ?? "mydb",
};

export const databaseUrl = `mysql://${config.mysqlUser}:${config.mysqlPassword}@${config.mysqlHost}:${config.mysqlPort}/${config.mysqlDatabase}`;
