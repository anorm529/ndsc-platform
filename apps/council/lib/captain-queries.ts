import "server-only";

import { councilQuery } from "@/db/council-db";

export interface CaptainAssignment {
  id: string;
  userId: string;
  teamId: string;
  seasonYear: number;
  assignedBy: string;
  assignedAt: Date;
}

/** Team IDs this user captains in the given season year. */
export async function getCaptainTeamIdsForSeason(
  userId: string,
  seasonYear: number
): Promise<string[]> {
  const result = await councilQuery<{ team_id: string }>(
    `SELECT team_id FROM season_captain_assignments
     WHERE user_id = $1 AND season_year = $2`,
    [userId, seasonYear]
  );
  return result.rows.map((r) => r.team_id);
}

/** All captain assignments for a given season year. */
export async function getAllCaptainAssignmentsForSeason(
  seasonYear: number
): Promise<CaptainAssignment[]> {
  const result = await councilQuery<{
    id: string; user_id: string; team_id: string;
    season_year: number; assigned_by: string; assigned_at: Date;
  }>(
    `SELECT id, user_id, team_id, season_year, assigned_by, assigned_at
     FROM season_captain_assignments
     WHERE season_year = $1`,
    [seasonYear]
  );
  return result.rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    teamId: r.team_id,
    seasonYear: r.season_year,
    assignedBy: r.assigned_by,
    assignedAt: r.assigned_at,
  }));
}

/** Assign a captain to a team for a season (upserts — replaces any existing captain for that team/year). */
export async function setCaptainForTeam(
  userId: string,
  teamId: string,
  seasonYear: number,
  assignedBy: string
): Promise<void> {
  await councilQuery(
    `INSERT INTO season_captain_assignments (user_id, team_id, season_year, assigned_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (team_id, season_year) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           assigned_by = EXCLUDED.assigned_by,
           assigned_at = NOW()`,
    [userId, teamId, seasonYear, assignedBy]
  );
}

/** Remove the captain assignment for a team/season. */
export async function removeCaptainForTeam(
  teamId: string,
  seasonYear: number
): Promise<void> {
  await councilQuery(
    `DELETE FROM season_captain_assignments WHERE team_id = $1 AND season_year = $2`,
    [teamId, seasonYear]
  );
}
