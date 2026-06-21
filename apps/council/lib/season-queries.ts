import "server-only";

import { mainQuery } from "@/lib/main-db";
import type { PlayerRow } from "@/lib/main-db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SeasonStatus = "draft" | "active" | "closed" | "archived";

export interface SeasonRow {
  id: string;
  year: number;
  status: SeasonStatus;
  isActive: boolean;
  createdAt: Date;
  enrolledCount?: number;
  assignedCount?: number;
}

export interface TeamRow {
  id: string;
  name: string;
  slug: string;
}

export interface EnrollmentRow {
  id: string;
  playerId: string;
  displayName: string;
  gender: string | null;
  userId: string | null;
  email: string | null;
  registrationName: string | null;
  currentTeamId: string | null;
  currentTeamName: string | null;
  enrolledAt: Date;
  notes: string | null;
}

export interface PreviousSeasonPlayer extends PlayerRow {
  prevTeamId: string | null;
  prevTeamName: string | null;
}

// ─── Season CRUD ──────────────────────────────────────────────────────────────

export async function getAllSeasons(): Promise<SeasonRow[]> {
  const result = await mainQuery<{
    id: string; year: number; status: string; is_active: boolean;
    created_at: Date; enrolled: string; assigned: string;
  }>(
    `SELECT s.id, s.year, s.status, s.is_active, s.created_at,
            COUNT(se.id)::text AS enrolled,
            COUNT(se.id) FILTER (WHERE se.current_team_id IS NOT NULL)::text AS assigned
     FROM seasons s
     LEFT JOIN season_enrollments se ON se.season_id = s.id
     GROUP BY s.id, s.year, s.status, s.is_active
     ORDER BY s.year DESC`
  );

  return result.rows.map((r) => ({
    id: r.id,
    year: r.year,
    status: r.status as SeasonStatus,
    isActive: r.is_active,
    createdAt: r.created_at,
    enrolledCount: parseInt(r.enrolled, 10),
    assignedCount: parseInt(r.assigned, 10),
  }));
}

export async function getSeasonById(id: string): Promise<SeasonRow | null> {
  const result = await mainQuery<{
    id: string; year: number; status: string; is_active: boolean;
    created_at: Date; enrolled: string; assigned: string;
  }>(
    `SELECT s.id, s.year, s.status, s.is_active, s.created_at,
            COUNT(se.id)::text AS enrolled,
            COUNT(se.id) FILTER (WHERE se.current_team_id IS NOT NULL)::text AS assigned
     FROM seasons s
     LEFT JOIN season_enrollments se ON se.season_id = s.id
     WHERE s.id = $1
     GROUP BY s.id, s.year, s.status, s.is_active`,
    [id]
  );
  if (!result.rows[0]) return null;
  const r = result.rows[0];
  return {
    id: r.id,
    year: r.year,
    status: r.status as SeasonStatus,
    isActive: r.is_active,
    createdAt: r.created_at,
    enrolledCount: parseInt(r.enrolled, 10),
    assignedCount: parseInt(r.assigned, 10),
  };
}

export async function createSeason(year: number, status: SeasonStatus = "draft"): Promise<string> {
  const result = await mainQuery<{ id: string }>(
    `INSERT INTO seasons (year, status, is_active) VALUES ($1, $2, $3) RETURNING id`,
    [year, status, status === "active"]
  );
  return result.rows[0]!.id;
}

export async function updateSeasonStatus(id: string, status: SeasonStatus): Promise<void> {
  // Only one season can be is_active at a time
  if (status === "active") {
    await mainQuery(`UPDATE seasons SET is_active = false WHERE id != $1`, [id]);
  }
  await mainQuery(
    `UPDATE seasons SET status = $1, is_active = $2 WHERE id = $3`,
    [status, status === "active", id]
  );
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function getAllTeams(): Promise<TeamRow[]> {
  const result = await mainQuery<{ id: string; name: string; slug: string }>(
    `SELECT id, name, slug FROM teams ORDER BY name ASC`
  );
  return result.rows;
}

// ─── Enrollment ───────────────────────────────────────────────────────────────

export async function getSeasonEnrollments(seasonId: string): Promise<EnrollmentRow[]> {
  const result = await mainQuery<{
    id: string; player_id: string; display_name: string; gender: string | null;
    user_id: string | null; email: string | null; registration_name: string | null;
    current_team_id: string | null; team_name: string | null;
    enrolled_at: Date; notes: string | null;
  }>(
    `SELECT se.id, se.player_id, p.display_name, p.gender,
            u.id AS user_id, u.email, u.registration_name,
            se.current_team_id, t.name AS team_name,
            se.enrolled_at, se.notes
     FROM season_enrollments se
     JOIN players p ON p.id = se.player_id
     LEFT JOIN users u ON u.player_id = p.id
     LEFT JOIN teams t ON t.id = se.current_team_id
     WHERE se.season_id = $1
     ORDER BY t.name ASC NULLS LAST,
              COALESCE(u.registration_name, p.display_name) ASC`,
    [seasonId]
  );

  return result.rows.map((r) => ({
    id: r.id,
    playerId: r.player_id,
    displayName: r.display_name,
    gender: r.gender,
    userId: r.user_id,
    email: r.email,
    registrationName: r.registration_name,
    currentTeamId: r.current_team_id,
    currentTeamName: r.team_name,
    enrolledAt: r.enrolled_at,
    notes: r.notes,
  }));
}

// Players from the previous season (from player_team_seasons for older seasons,
// or season_enrollments if they were managed via council)
export async function getPreviousSeasonPlayers(currentYear: number): Promise<PreviousSeasonPlayer[]> {
  const result = await mainQuery<{
    player_id: string; display_name: string; gender: string | null;
    user_id: string | null; email: string | null; account_status: string | null;
    registration_name: string | null; team_name: string | null; team_id: string | null;
  }>(
    `WITH prev_season AS (
       SELECT id, year FROM seasons
       WHERE year = (
         SELECT MAX(year) FROM seasons WHERE year < $1
       )
     )
     SELECT * FROM (
       -- Prefer season_enrollments if that season was council-managed
       SELECT p.id AS player_id, p.display_name, p.gender,
              u.id AS user_id, u.email, u.account_status, u.registration_name,
              t.name AS team_name, t.id AS team_id
       FROM season_enrollments se
       JOIN prev_season ps ON ps.id = se.season_id
       JOIN players p ON p.id = se.player_id
       LEFT JOIN users u ON u.player_id = p.id
       LEFT JOIN teams t ON t.id = se.current_team_id
       WHERE p.active = true

       UNION

       -- Fallback: player_team_seasons (pre-council-management data)
       SELECT p.id AS player_id, p.display_name, p.gender,
              u.id AS user_id, u.email, u.account_status, u.registration_name,
              t.name AS team_name, t.id AS team_id
       FROM player_team_seasons pts
       JOIN prev_season ps ON ps.id = pts.season_id
       JOIN players p ON p.id = pts.player_id
       LEFT JOIN users u ON u.player_id = p.id
       LEFT JOIN teams t ON t.id = pts.team_id
       WHERE p.active = true
         AND NOT EXISTS (
           SELECT 1 FROM season_enrollments se2
           JOIN prev_season ps2 ON ps2.id = se2.season_id
           WHERE se2.player_id = pts.player_id
         )
     ) combined
     ORDER BY team_name ASC NULLS LAST,
              COALESCE(registration_name, display_name) ASC`,
    [currentYear]
  );

  return result.rows.map((r) => ({
    playerId: r.player_id,
    displayName: r.display_name,
    gender: r.gender,
    userId: r.user_id,
    email: r.email,
    accountStatus: r.account_status,
    registrationName: r.registration_name,
    teamName: r.team_name,
    prevTeamId: r.team_id,
    prevTeamName: r.team_name,
  }));
}

// All active players NOT yet enrolled in a given season
export async function getUnenrolledActivePlayers(seasonId: string): Promise<PlayerRow[]> {
  const result = await mainQuery<{
    player_id: string; display_name: string; gender: string | null;
    user_id: string | null; email: string | null; account_status: string | null;
    registration_name: string | null; team_name: string | null;
  }>(
    `SELECT p.id AS player_id, p.display_name, p.gender,
            u.id AS user_id, u.email, u.account_status, u.registration_name,
            NULL::text AS team_name
     FROM players p
     LEFT JOIN users u ON u.player_id = p.id
     WHERE p.active = true
       AND NOT EXISTS (
         SELECT 1 FROM season_enrollments se
         WHERE se.player_id = p.id AND se.season_id = $1
       )
     ORDER BY COALESCE(u.registration_name, p.display_name) ASC`,
    [seasonId]
  );

  return result.rows.map((r) => ({
    playerId: r.player_id,
    displayName: r.display_name,
    gender: r.gender,
    userId: r.user_id,
    email: r.email,
    accountStatus: r.account_status,
    registrationName: r.registration_name,
    teamName: r.team_name,
  }));
}

// ─── Enrollment mutations ─────────────────────────────────────────────────────

export async function enrollPlayers(
  playerIds: string[],
  seasonId: string,
  enrolledBy: string,
  teamId?: string | null
): Promise<void> {
  if (playerIds.length === 0) return;
  const placeholders = playerIds
    .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
    .join(", ");
  const values = playerIds.flatMap((pid) => [pid, seasonId, enrolledBy, teamId ?? null]);
  await mainQuery(
    `INSERT INTO season_enrollments (player_id, season_id, enrolled_by, current_team_id)
     VALUES ${placeholders}
     ON CONFLICT (player_id, season_id) DO NOTHING`,
    values
  );
}

export async function unenrollPlayer(playerId: string, seasonId: string): Promise<void> {
  await mainQuery(
    `DELETE FROM season_enrollments WHERE player_id = $1 AND season_id = $2`,
    [playerId, seasonId]
  );
}

export async function assignToTeam(
  playerId: string,
  seasonId: string,
  newTeamId: string | null,
  transferredBy: string,
  notes?: string
): Promise<void> {
  // Get current team for transfer log
  const current = await mainQuery<{ current_team_id: string | null }>(
    `SELECT current_team_id FROM season_enrollments WHERE player_id = $1 AND season_id = $2`,
    [playerId, seasonId]
  );
  const fromTeamId = current.rows[0]?.current_team_id ?? null;

  // Update enrollment
  await mainQuery(
    `UPDATE season_enrollments SET current_team_id = $1 WHERE player_id = $2 AND season_id = $3`,
    [newTeamId, playerId, seasonId]
  );

  // Log transfer (skip if no actual change)
  if (fromTeamId !== newTeamId) {
    await mainQuery(
      `INSERT INTO season_roster_transfers
         (player_id, season_id, from_team_id, to_team_id, transferred_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [playerId, seasonId, fromTeamId, newTeamId, transferredBy, notes ?? null]
    );

    // Sync to player_team_seasons for stats compatibility
    if (newTeamId) {
      await mainQuery(
        `INSERT INTO player_team_seasons (player_id, team_id, season_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (player_id, team_id, season_id) DO NOTHING`,
        [playerId, newTeamId, seasonId]
      );
    }
  }
}

// ─── Player creation ──────────────────────────────────────────────────────────

export async function createPlayer(displayName: string, gender?: string): Promise<string> {
  const normalized = displayName.trim().toLowerCase().replace(/\s+/g, " ");
  const result = await mainQuery<{ id: string }>(
    `INSERT INTO players (display_name, normalized_name, gender, active)
     VALUES ($1, $2, $3, true)
     RETURNING id`,
    [displayName.trim(), normalized, gender ?? "Unknown"]
  );
  return result.rows[0]!.id;
}
