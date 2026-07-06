import "server-only";

import { mainQuery } from "@/lib/main-db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PendingAccount {
  id: string;
  email: string;
  registrationName: string | null;
  createdAt: Date;
  emailVerified: boolean;
  playerId: string | null;
  playerName: string | null;
  suggestions: PlayerSuggestion[];
}

export interface PlayerSuggestion {
  playerId: string;
  displayName: string;
  gender: string | null;
  score: number;
}

export interface DataFlags {
  unlinkedActive: UnlinkedUser[];
  multiUserPlayers: MultiUserPlayer[];
  stalePending: StalePending[];
  playersWithoutAccounts: PlayerNoAccount[];
}

export interface UnlinkedUser {
  id: string;
  email: string;
  registrationName: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface MultiUserPlayer {
  playerId: string;
  playerName: string;
  userCount: number;
  users: { id: string; email: string; accountStatus: string }[];
}

export interface StalePending {
  id: string;
  email: string;
  registrationName: string | null;
  createdAt: Date;
  daysPending: number;
}

export interface PlayerNoAccount {
  playerId: string;
  displayName: string;
  gender: string | null;
}

// ─── Pending accounts ─────────────────────────────────────────────────────────

export async function getPendingAccounts(): Promise<PendingAccount[]> {
  const result = await mainQuery<{
    id: string;
    email: string;
    registration_name: string | null;
    created_at: Date;
    email_verified: boolean;
    player_id: string | null;
    player_name: string | null;
  }>(
    `SELECT u.id, u.email, u.registration_name, u.created_at,
            u.email_verified,
            u.player_id, p.display_name AS player_name
     FROM users u
     LEFT JOIN players p ON p.id = u.player_id
     WHERE u.account_status = 'pending'
     ORDER BY u.created_at ASC`
  );

  const accounts = result.rows.map((r) => ({
    id: r.id,
    email: r.email,
    registrationName: r.registration_name,
    createdAt: r.created_at,
    emailVerified: r.email_verified,
    playerId: r.player_id,
    playerName: r.player_name,
    suggestions: [] as PlayerSuggestion[],
  }));

  // Fetch suggestions for each unlinked account
  for (const account of accounts) {
    if (!account.playerId) {
      account.suggestions = await suggestPlayers(account.email, account.registrationName);
    }
  }

  return accounts;
}

async function suggestPlayers(
  email: string,
  registrationName: string | null
): Promise<PlayerSuggestion[]> {
  // Build search tokens from registration name or email prefix
  const namePart = registrationName ?? email.split("@")[0];
  const tokens = namePart
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

  if (tokens.length === 0) return [];

  // Find players whose normalised name contains any token
  const conditions = tokens.map((_, i) => `p.normalized_name ILIKE $${i + 1}`).join(" OR ");
  const params = tokens.map((t) => `%${t}%`);

  const res = await mainQuery<{
    id: string;
    display_name: string;
    gender: string | null;
    normalized_name: string;
  }>(
    `SELECT id, display_name, gender, normalized_name
     FROM players p
     WHERE p.active = true AND (${conditions})
     LIMIT 8`,
    params
  );

  return res.rows.map((p) => {
    // Simple score: number of tokens that appear in the player name
    const norm = p.normalized_name.toLowerCase();
    const score = tokens.filter((t) => norm.includes(t)).length;
    return {
      playerId: p.id,
      displayName: p.display_name,
      gender: p.gender,
      score,
    };
  }).sort((a, b) => b.score - a.score);
}

// ─── Account mutations ────────────────────────────────────────────────────────

export async function approveAccount(userId: string, actorId: string): Promise<void> {
  await mainQuery(
    `UPDATE users SET account_status = 'active' WHERE id = $1`,
    [userId]
  );
  await mainQuery(
    `INSERT INTO admin_audit_log (actor_user_id, target_user_id, action, new_value)
     VALUES ($1, $2, 'account_approve', to_jsonb($3::text))`,
    [actorId, userId, 'active']
  );
}

export async function denyAccount(userId: string, actorId: string): Promise<void> {
  await mainQuery(
    `UPDATE users SET account_status = 'disabled' WHERE id = $1`,
    [userId]
  );
  await mainQuery(
    `INSERT INTO admin_audit_log (actor_user_id, target_user_id, action, new_value)
     VALUES ($1, $2, 'account_disable', to_jsonb($3::text))`,
    [actorId, userId, 'disabled']
  );
}

export async function linkPlayerToUser(
  userId: string,
  playerId: string,
  actorId: string
): Promise<void> {
  // Unlink any existing link to this player first
  await mainQuery(
    `UPDATE users SET player_id = NULL WHERE player_id = $1 AND id != $2`,
    [playerId, userId]
  );
  await mainQuery(
    `UPDATE users SET player_id = $1 WHERE id = $2`,
    [playerId, userId]
  );
  await mainQuery(
    `INSERT INTO admin_audit_log (actor_user_id, target_user_id, action, new_value)
     VALUES ($1, $2, 'link', to_jsonb($3::text))`,
    [actorId, userId, playerId]
  );
}

// ─── Data integrity flags ─────────────────────────────────────────────────────

export async function getDataFlags(): Promise<DataFlags> {
  const [unlinkedRes, multiRes, staleRes, noAccountRes] = await Promise.all([
    // 1. Active users without a player link
    mainQuery<{
      id: string; email: string; registration_name: string | null;
      created_at: Date; last_login: Date | null;
    }>(
      `SELECT id, email, registration_name, created_at, last_login
       FROM users
       WHERE account_status = 'active' AND player_id IS NULL
       ORDER BY created_at DESC
       LIMIT 50`
    ),

    // 2. Players with more than one user account
    mainQuery<{
      player_id: string; display_name: string; user_count: string;
    }>(
      `SELECT p.id AS player_id, p.display_name, COUNT(u.id)::text AS user_count
       FROM players p
       JOIN users u ON u.player_id = p.id
       GROUP BY p.id, p.display_name
       HAVING COUNT(u.id) > 1
       ORDER BY COUNT(u.id) DESC, p.display_name ASC
       LIMIT 20`
    ),

    // 3. Pending accounts older than 14 days
    mainQuery<{
      id: string; email: string; registration_name: string | null;
      created_at: Date; days_pending: string;
    }>(
      `SELECT id, email, registration_name, created_at,
              EXTRACT(day FROM NOW() - created_at)::text AS days_pending
       FROM users
       WHERE account_status = 'pending'
         AND created_at < NOW() - INTERVAL '14 days'
       ORDER BY created_at ASC
       LIMIT 50`
    ),

    // 4. Active players with no user account at all
    mainQuery<{ id: string; display_name: string; gender: string | null }>(
      `SELECT p.id, p.display_name, p.gender
       FROM players p
       WHERE p.active = true
         AND NOT EXISTS (
           SELECT 1 FROM users u WHERE u.player_id = p.id
         )
       ORDER BY p.display_name ASC
       LIMIT 50`
    ),
  ]);

  // For multi-user players, fetch their individual user accounts
  const multiUserPlayers: MultiUserPlayer[] = [];
  for (const row of multiRes.rows) {
    const usersRes = await mainQuery<{
      id: string; email: string; account_status: string;
    }>(
      `SELECT id, email, account_status FROM users WHERE player_id = $1`,
      [row.player_id]
    );
    multiUserPlayers.push({
      playerId: row.player_id,
      playerName: row.display_name,
      userCount: parseInt(row.user_count, 10),
      users: usersRes.rows.map((u) => ({
        id: u.id,
        email: u.email,
        accountStatus: u.account_status,
      })),
    });
  }

  return {
    unlinkedActive: unlinkedRes.rows.map((r) => ({
      id: r.id,
      email: r.email,
      registrationName: r.registration_name,
      createdAt: r.created_at,
      lastLoginAt: r.last_login,
    })),
    multiUserPlayers,
    stalePending: staleRes.rows.map((r) => ({
      id: r.id,
      email: r.email,
      registrationName: r.registration_name,
      createdAt: r.created_at,
      daysPending: parseInt(r.days_pending, 10),
    })),
    playersWithoutAccounts: noAccountRes.rows.map((r) => ({
      playerId: r.id,
      displayName: r.display_name,
      gender: r.gender,
    })),
  };
}

export async function getFlagCount(): Promise<number> {
  const result = await mainQuery<{ total: string }>(
    `SELECT (
       (SELECT COUNT(*) FROM users WHERE account_status = 'active' AND player_id IS NULL) +
       (SELECT COUNT(*) FROM (SELECT player_id FROM users WHERE player_id IS NOT NULL GROUP BY player_id HAVING COUNT(*) > 1) x) +
       (SELECT COUNT(*) FROM users WHERE account_status = 'pending' AND created_at < NOW() - INTERVAL '14 days') +
       (SELECT COUNT(*) FROM players p WHERE p.active = true AND NOT EXISTS (SELECT 1 FROM users u WHERE u.player_id = p.id))
     )::text AS total`
  );
  return parseInt(result.rows[0]?.total ?? "0", 10);
}

export async function getFlaggedPlayerIds(): Promise<Set<string>> {
  const result = await mainQuery<{ player_id: string }>(
    `SELECT player_id FROM users WHERE player_id IS NOT NULL GROUP BY player_id HAVING COUNT(*) > 1`
  );
  return new Set(result.rows.map((r) => r.player_id));
}
