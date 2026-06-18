import "server-only";

import { Pool, type QueryResultRow } from "pg";

type GlobalWithPg = typeof globalThis & {
  ndscPgPool?: Pool;
  ndscPgConnectionString?: string;
};

function getConnectionString() {
  return process.env.DATABASE_URL?.trim() || "";
}

export function isDatabaseConfigured() {
  return Boolean(getConnectionString());
}

export function validateDatabaseUrl() {
  const connectionString = getConnectionString();

  if (!connectionString) {
    return "DATABASE_URL is not configured.";
  }

  try {
    const parsed = new URL(connectionString);
    const invalidHosts = new Set(["host", "hostname", "your-host", "example.com"]);

    if (!parsed.hostname || invalidHosts.has(parsed.hostname.toLowerCase())) {
      return "DATABASE_URL still contains a placeholder host. Use the full Neon pooled connection string.";
    }

    if (!parsed.protocol.startsWith("postgres")) {
      return "DATABASE_URL must be a Postgres connection string.";
    }
  } catch {
    return "DATABASE_URL is not a valid connection string.";
  }

  return "";
}

export function getPool() {
  const connectionString = getConnectionString();
  const validationError = validateDatabaseUrl();

  if (validationError) {
    throw new Error(validationError);
  }

  const globalForPg = globalThis as GlobalWithPg;

  if (!globalForPg.ndscPgPool || globalForPg.ndscPgConnectionString !== connectionString) {
    globalForPg.ndscPgPool = new Pool({
      connectionString,
      ssl: connectionString.includes("sslmode=require") || connectionString.includes("sslmode=verify-full")
        ? {}
        : undefined,
    });
    globalForPg.ndscPgConnectionString = connectionString;
  }

  return globalForPg.ndscPgPool;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return getPool().query<T>(text, values);
}
