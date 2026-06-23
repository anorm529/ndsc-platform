import "server-only";

import { dbQuery } from "@/lib/db";

export async function getPlayerActiveTeamSlug(playerId: string): Promise<string | null> {
  const result = await dbQuery<{ slug: string }>(
    `SELECT t.slug
     FROM season_enrollments se
     JOIN seasons s ON s.id = se.season_id
     JOIN teams t ON t.id = se.current_team_id
     WHERE se.player_id = $1
     ORDER BY s.year DESC
     LIMIT 1`,
    [playerId]
  );
  return result.rows[0]?.slug ?? null;
}
