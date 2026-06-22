import "server-only";

import { Pool, type QueryResultRow } from "pg";

type GlobalWithPg = typeof globalThis & {
  ndscCouncilPool?: Pool;
  ndscCouncilConnStr?: string;
};

function getCouncilPool(): Pool {
  const connectionString = process.env.COUNCIL_DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("COUNCIL_DATABASE_URL is not set");
  }

  const g = globalThis as GlobalWithPg;
  if (!g.ndscCouncilPool || g.ndscCouncilConnStr !== connectionString) {
    g.ndscCouncilPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
    g.ndscCouncilConnStr = connectionString;
  }

  return g.ndscCouncilPool;
}

export async function councilQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
) {
  return getCouncilPool().query<T>(text, values);
}
