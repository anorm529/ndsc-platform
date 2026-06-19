import "server-only";

import { councilQuery } from "@/db/council-db";

export interface CouncilTeam {
  id: string;
  name: string;
  seasonYear: number;
}

export interface TeamMember {
  userId: string;
  teamId: string;
}

export async function getAllTeams(seasonYear?: number): Promise<CouncilTeam[]> {
  const values: unknown[] = [];
  const where = seasonYear
    ? `WHERE season_year = $${(values.push(seasonYear), values.length)}`
    : "";

  const result = await councilQuery<{ id: string; name: string; season_year: number }>(
    `SELECT id, name, season_year FROM council_teams ${where} ORDER BY season_year DESC, name ASC`,
    values
  );

  return result.rows.map((r) => ({ id: r.id, name: r.name, seasonYear: r.season_year }));
}

export async function getMemberTeamMap(): Promise<Map<string, string[]>> {
  const result = await councilQuery<{ user_id: string; team_id: string }>(
    `SELECT cmt.user_id, ct.id as team_id
     FROM council_member_teams cmt
     JOIN council_teams ct ON ct.id = cmt.team_id`
  );

  const map = new Map<string, string[]>();
  for (const row of result.rows) {
    const existing = map.get(row.user_id) ?? [];
    existing.push(row.team_id);
    map.set(row.user_id, existing);
  }
  return map;
}

export async function getCaptainTeamIds(userId: string): Promise<string[]> {
  const result = await councilQuery<{ team_id: string }>(
    `SELECT team_id FROM captain_team_assignments WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((r) => r.team_id);
}

export async function getMembersOnTeam(teamId: string): Promise<string[]> {
  const result = await councilQuery<{ user_id: string }>(
    `SELECT user_id FROM council_member_teams WHERE team_id = $1`,
    [teamId]
  );
  return result.rows.map((r) => r.user_id);
}

export async function addMemberToTeam(userId: string, teamId: string): Promise<void> {
  await councilQuery(
    `INSERT INTO council_member_teams (user_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, teamId]
  );
}

export async function removeMemberFromTeam(userId: string, teamId: string): Promise<void> {
  await councilQuery(
    `DELETE FROM council_member_teams WHERE user_id = $1 AND team_id = $2`,
    [userId, teamId]
  );
}

export async function createTeam(name: string, seasonYear: number): Promise<CouncilTeam> {
  const result = await councilQuery<{ id: string; name: string; season_year: number }>(
    `INSERT INTO council_teams (name, season_year) VALUES ($1, $2) RETURNING id, name, season_year`,
    [name, seasonYear]
  );
  const r = result.rows[0]!;
  return { id: r.id, name: r.name, seasonYear: r.season_year };
}
