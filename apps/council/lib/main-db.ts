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

export interface PlayerRow {
  playerId: string;
  displayName: string;
  gender: string | null;
  userId: string | null;
  email: string | null;
  accountStatus: string | null;
  registrationName: string | null;
  teamName: string | null;
  active: boolean;
}

const PLAYER_SELECT = `
  SELECT p.id AS player_id, p.display_name, p.gender, p.active,
         u.id AS user_id, u.email, u.account_status, u.registration_name,
         t.name AS team_name
  FROM players p
  LEFT JOIN users u ON u.player_id = p.id
  LEFT JOIN LATERAL (
    SELECT pts.team_id
    FROM player_team_seasons pts
    JOIN seasons s ON s.id = pts.season_id
    WHERE pts.player_id = p.id
      AND s.year = (
        SELECT MAX(s2.year)
        FROM player_team_seasons pts2
        JOIN seasons s2 ON s2.id = pts2.season_id
        WHERE pts2.player_id = p.id
      )
    LIMIT 1
  ) current_team ON true
  LEFT JOIN teams t ON t.id = current_team.team_id
`;

type PlayerRowRaw = {
  player_id: string;
  display_name: string;
  gender: string | null;
  active: boolean;
  user_id: string | null;
  email: string | null;
  account_status: string | null;
  registration_name: string | null;
  team_name: string | null;
};

function mapPlayerRow(r: PlayerRowRaw): PlayerRow {
  return {
    playerId: r.player_id,
    displayName: r.display_name ?? "",
    gender: r.gender,
    active: r.active,
    userId: r.user_id,
    email: r.email,
    accountStatus: r.account_status,
    registrationName: r.registration_name,
    teamName: r.team_name,
  };
}

export async function getAllActivePlayers(): Promise<PlayerRow[]> {
  const result = await mainQuery<PlayerRowRaw>(
    PLAYER_SELECT + `WHERE p.active = true ORDER BY coalesce(u.registration_name, p.display_name) ASC`
  );
  return result.rows.map(mapPlayerRow);
}

export async function getAllPlayers(): Promise<PlayerRow[]> {
  const result = await mainQuery<PlayerRowRaw>(
    PLAYER_SELECT + `ORDER BY p.active DESC, coalesce(u.registration_name, p.display_name) ASC`
  );
  return result.rows.map(mapPlayerRow);
}

export function playerDisplayName(p: PlayerRow): string {
  return p.registrationName || p.displayName || p.email?.split("@")[0] || "Unknown";
}

export async function getCouncilMembers(): Promise<MemberRow[]> {
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
     WHERE (
       u.role = 'owner'
       OR (
         (u.role = 'admin' OR u.account_status = 'active')
         AND EXISTS (
           SELECT 1 FROM app_permissions ap
           WHERE ap.user_id = u.id AND ap.app = 'council'
         )
       )
     )
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
