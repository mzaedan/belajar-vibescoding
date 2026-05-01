import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "../lib/config";

export const mysqlPool = mysql.createPool({
  host: config.mysqlHost,
  port: config.mysqlPort,
  user: config.mysqlUser,
  password: config.mysqlPassword,
  database: config.mysqlDatabase,
  waitForConnections: true,
  connectionLimit: 10,
});

export const db = drizzle(mysqlPool, { mode: "default" });
