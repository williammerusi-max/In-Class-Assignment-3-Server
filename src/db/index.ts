import "dotenv/config";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema.js";
import { AppError } from "../utils/app-error.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new AppError("DATABASE_URL is not configured", 500);
}

export const pool = mysql.createPool(databaseUrl);
export const db = drizzle(pool, { schema, mode: "default" });
