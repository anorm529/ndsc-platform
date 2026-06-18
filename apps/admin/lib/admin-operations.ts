import "server-only";

import { dbQuery } from "@/lib/db";

export type AdminNote = {
  id: string;
  actorEmail: string | null;
  note: string;
  createdAt: Date;
};

export async function getAdminNotesForAccount(userId: string) {
  try {
    const result = await dbQuery<{
      id: string;
      actor_email: string | null;
      note: string;
      created_at: Date;
    }>(
      `select n.id, actor.email as actor_email, n.note, n.created_at
      from admin_notes n
      left join users actor on actor.id = n.actor_user_id
      where n.target_user_id = $1
      order by n.created_at desc
      limit 25`,
      [userId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      actorEmail: row.actor_email,
      note: row.note,
      createdAt: row.created_at,
    })) satisfies AdminNote[];
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "42P01") {
      return [];
    }

    throw error;
  }
}

export async function getApprovalQueue() {
  const result = await dbQuery<{
    id: string;
    email: string;
    player_id: string | null;
    player_name: string | null;
    created_at: Date;
    suggested_players: {
      id: string;
      displayName: string;
      normalizedName: string;
      membershipStatus: string | null;
      matchScore: number;
    }[] | null;
  }>(
    `select
      u.id,
      u.email,
      u.player_id,
      p.display_name as player_name,
      u.created_at,
      coalesce(suggestions.suggested_players, '[]'::jsonb) as suggested_players
    from users u
    left join players p on p.id = u.player_id
    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'id', ranked.id,
          'displayName', ranked.display_name,
          'normalizedName', ranked.normalized_name,
          'membershipStatus', ranked.membership_status,
          'matchScore', ranked.match_score
        )
        order by ranked.match_score desc, ranked.display_name asc
      ) as suggested_players
      from (
        select
          p.id,
          p.display_name,
          p.normalized_name,
          pp.membership_status,
          (
            select count(*)::int
            from unnest(regexp_split_to_array(lower(split_part(u.email, '@', 1)), '[^a-z]+')) token
            where length(token) > 1 and p.normalized_name like '%' || token || '%'
          ) as match_score
        from players p
        left join player_profiles pp on pp.player_id = p.id
        where u.player_id is null
          and exists (
            select 1
            from unnest(regexp_split_to_array(lower(split_part(u.email, '@', 1)), '[^a-z]+')) token
            where length(token) > 1 and p.normalized_name like '%' || token || '%'
          )
        order by match_score desc, p.display_name asc
        limit 3
      ) ranked
    ) suggestions on true
    where u.account_status = 'pending'
    order by u.created_at asc
    limit 100`,
  );

  return result.rows;
}

export async function getAdminFlags() {
  const [unlinked, multiUserPlayers, playersWithoutProfiles, stalePending] =
    await Promise.all([
      dbQuery<{ id: string; email: string; created_at: Date }>(
        `select id, email, created_at
        from users
        where player_id is null
        order by created_at desc
        limit 50`,
      ),
      dbQuery<{ player_id: string; display_name: string; user_count: string }>(
        `select u.player_id, p.display_name, count(*)::text as user_count
        from users u
        join players p on p.id = u.player_id
        where u.player_id is not null
        group by u.player_id, p.display_name
        having count(*) > 1
        order by count(*) desc, p.display_name asc
        limit 50`,
      ),
      dbQuery<{ id: string; display_name: string }>(
        `select p.id, p.display_name
        from players p
        left join player_profiles pp on pp.player_id = p.id
        where pp.player_id is null
        order by p.display_name asc
        limit 50`,
      ),
      dbQuery<{ id: string; email: string; created_at: Date }>(
        `select id, email, created_at
        from users
        where account_status = 'pending' and created_at < now() - interval '14 days'
        order by created_at asc
        limit 50`,
      ),
    ]);

  return {
    unlinked: unlinked.rows,
    multiUserPlayers: multiUserPlayers.rows,
    playersWithoutProfiles: playersWithoutProfiles.rows,
    stalePending: stalePending.rows,
  };
}

export async function getCleanupOverview() {
  const [expiredSessions, expiredTokens, oldEmailEvents] = await Promise.all([
    dbQuery<{ count: string }>(
      "select count(*)::text as count from user_sessions where expires_at <= now()",
    ),
    dbQuery<{ count: string }>(
      "select count(*)::text as count from password_reset_tokens where used_at is null and expires_at <= now()",
    ),
    dbQuery<{ count: string }>(
      "select count(*)::text as count from email_events where created_at < now() - interval '180 days'",
    ).catch((error) => {
      if (typeof error === "object" && error && "code" in error && error.code === "42P01") {
        return { rows: [{ count: "0" }] };
      }
      throw error;
    }),
  ]);

  return {
    expiredSessions: Number(expiredSessions.rows[0]?.count ?? 0),
    expiredResetTokens: Number(expiredTokens.rows[0]?.count ?? 0),
    oldEmailEvents: Number(oldEmailEvents.rows[0]?.count ?? 0),
  };
}

export async function getSecurityOverview() {
  const [privilegedUsers, recentLogins, recentSecurityAudit] = await Promise.all([
    dbQuery<{
      id: string;
      email: string;
      role: string;
      account_status: string;
      last_login: Date | null;
      active_sessions: string;
    }>(
      `select
        u.id,
        u.email,
        u.role,
        u.account_status,
        u.last_login,
        count(s.id) filter (where s.expires_at > now())::text as active_sessions
      from users u
      left join user_sessions s on s.user_id = u.id
      where u.role in ('admin', 'owner')
      group by u.id
      order by case u.role when 'owner' then 0 else 1 end, u.email asc`,
    ),
    dbQuery<{ email: string; last_login: Date | null }>(
      `select email, last_login
      from users
      where role in ('admin', 'owner') and last_login is not null
      order by last_login desc
      limit 10`,
    ),
    dbQuery<{
      actor_email: string | null;
      target_email: string | null;
      action: string;
      created_at: Date;
    }>(
      `select actor.email as actor_email, target.email as target_email, a.action, a.created_at
      from admin_audit_log a
      left join users actor on actor.id = a.actor_user_id
      left join users target on target.id = a.target_user_id
      where a.action in ('account.role_change', 'account.password_reset', 'account.disable')
      order by a.created_at desc
      limit 20`,
    ).catch((error) => {
      if (typeof error === "object" && error && "code" in error && error.code === "42P01") {
        return { rows: [] };
      }
      throw error;
    }),
  ]);

  return {
    privilegedUsers: privilegedUsers.rows,
    recentLogins: recentLogins.rows,
    recentSecurityAudit: recentSecurityAudit.rows,
  };
}
