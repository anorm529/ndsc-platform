import "server-only";

import { Pool, type QueryResultRow } from "pg";

type GlobalWithPg = typeof globalThis & {
  ndscPgPool?: Pool;
};

function getConnectionString() {
  return process.env.DATABASE_URL?.trim() || "";
}

export function isDatabaseConfigured() {
  return Boolean(getConnectionString());
}

export function getPool() {
  const connectionString = getConnectionString();

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const globalForPg = globalThis as GlobalWithPg;

  if (!globalForPg.ndscPgPool) {
    globalForPg.ndscPgPool = new Pool({
      connectionString,
      ssl: connectionString.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }

  return globalForPg.ndscPgPool;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return getPool().query<T>(text, values);
}
