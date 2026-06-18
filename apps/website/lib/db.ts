import "server-only";

import { Pool } from "pg";
import type { QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL;

const pool =
  connectionString
    ? new Pool({
        connectionString,
        ssl:
          connectionString.includes("sslmode=require") ||
          connectionString.includes("sslmode=verify-full")
            ? {}
            : undefined,
      })
    : null;

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
) {
  if (!pool) {
    throw new Error("Missing DATABASE_URL");
  }

  return pool.query<T>(text, values);
}
