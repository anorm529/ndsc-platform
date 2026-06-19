import "server-only";

import { Pool, type QueryResultRow } from "pg";

type GlobalWithPg = typeof globalThis & {
  ndscMainPool?: Pool;
  ndscMainConnStr?: string;
};

function getMainPool(): Pool {
  const connectionString = process.env.AUTH_DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("AUTH_DATABASE_URL environment variable is not set");
  }

  const g = globalThis as GlobalWithPg;
  if (!g.ndscMainPool || g.ndscMainConnStr !== connectionString) {
    g.ndscMainPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
    g.ndscMainConnStr = connectionString;
  }

  return g.ndscMainPool;
}

export async function mainQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
) {
  return getMainPool().query<T>(text, values);
}

export interface MemberRow {
  id: string;
  email: string;
  registrationName: string | null;
  displayName: string | null;
  playerId: string | null;
}

export async function getAllActiveMembers(): Promise<MemberRow[]> {
  const result = await mainQuery<{
    id: string;
    email: string;
    registration_name: string | null;
    display_name: string | null;
    player_id: string | null;
  }>(
    `SELECT u.id, u.email, u.registration_name, p.display_name, u.player_id
     FROM users u
     LEFT JOIN players p ON p.id = u.player_id
     WHERE u.account_status = 'active'
     ORDER BY coalesce(u.registration_name, split_part(u.email, '@', 1)) ASC`
  );

  return result.rows.map((r) => ({
    id: r.id,
    email: r.email,
    registrationName: r.registration_name,
    displayName: r.display_name,
    playerId: r.player_id,
  }));
}

export async function getMemberById(userId: string): Promise<MemberRow | null> {
  const result = await mainQuery<{
    id: string;
    email: string;
    registration_name: string | null;
    display_name: string | null;
    player_id: string | null;
  }>(
    `SELECT u.id, u.email, u.registration_name, p.display_name, u.player_id
     FROM users u
     LEFT JOIN players p ON p.id = u.player_id
     WHERE u.id = $1`,
    [userId]
  );

  if (!result.rows[0]) return null;
  const r = result.rows[0];
  return {
    id: r.id,
    email: r.email,
    registrationName: r.registration_name,
    displayName: r.display_name,
    playerId: r.player_id,
  };
}

export function memberDisplayName(m: MemberRow): string {
  return m.registrationName || m.displayName || m.email.split("@")[0];
}
