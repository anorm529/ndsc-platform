import "server-only";

import { getAuditLogForAccount, type AdminAuditEntry } from "@/lib/admin-audit";
import { getAdminNotesForAccount, type AdminNote } from "@/lib/admin-operations";
import { dbQuery } from "@/lib/db";
import type { AdminRole, AccountStatus } from "@/lib/admin-session";

export type UserFilter = {
  status?: string;
  role?: string;
  link?: string;
  q?: string;
};

export type AdminAccountSummary = {
  pendingUsers: number;
  activeUsers: number;
  disabledUsers: number;
  unlinkedUsers: number;
};

export type AdminAccountRow = {
  id: string;
  email: string;
  role: AdminRole;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  playerId: string | null;
  registrationName: string | null;
  playerName: string | null;
  membershipStatus: string | null;
  lastLogin: Date | null;
  createdAt: Date;
  suggestedPlayers: PlayerSuggestion[];
};

export type PlayerSuggestion = {
  id: string;
  displayName: string;
  normalizedName: string;
  active: boolean | null;
  membershipStatus: string | null;
  matchScore?: number;
};

export type PlayerSearchRow = PlayerSuggestion;

export type AccountDetail = AdminAccountRow & {
  registrationName: string | null;
  profile: {
    position: string | null;
    bats: string | null;
    throws: string | null;
    shirtNumber: string | null;
    profileImageUrl: string | null;
    membershipStatus: string | null;
    memberSince: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  } | null;
  sessions: {
    id: string;
    expiresAt: Date;
    createdAt: Date;
    lastSeen: Date | null;
    deviceName: string | null;
    ipAddress: string | null;
  }[];
  playerMatches: PlayerSearchRow[];
  auditLog: AdminAuditEntry[];
  notes: AdminNote[];
};

export async function getAccountSummary() {
  const result = await dbQuery<{
    pending_users: string;
    active_users: string;
    disabled_users: string;
    unlinked_users: string;
  }>(
    `select
      count(*) filter (where account_status = 'pending')::text as pending_users,
      count(*) filter (where account_status = 'active')::text as active_users,
      count(*) filter (where account_status = 'disabled')::text as disabled_users,
      count(*) filter (where player_id is null)::text as unlinked_users
    from users`,
  );
  const row = result.rows[0];

  return {
    pendingUsers: Number(row?.pending_users ?? 0),
    activeUsers: Number(row?.active_users ?? 0),
    disabledUsers: Number(row?.disabled_users ?? 0),
    unlinkedUsers: Number(row?.unlinked_users ?? 0),
  } satisfies AdminAccountSummary;
}

export async function getAccounts(filters: UserFilter) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (["pending", "active", "disabled"].includes(filters.status ?? "")) {
    values.push(filters.status);
    clauses.push(`u.account_status = $${values.length}`);
  }

  if (["player", "admin", "owner"].includes(filters.role ?? "")) {
    values.push(filters.role);
    clauses.push(`u.role = $${values.length}`);
  }

  if (filters.link === "linked") {
    clauses.push("u.player_id is not null");
  } else if (filters.link === "unlinked") {
    clauses.push("u.player_id is null");
  }

  if (filters.q?.trim()) {
    values.push(`%${filters.q.trim().toLowerCase()}%`);
    clauses.push(`(
      lower(u.email) like $${values.length}
      or lower(coalesce(p.display_name, '')) like $${values.length}
      or lower(coalesce(p.normalized_name, '')) like $${values.length}
    )`);
  }

  const whereSql = clauses.length ? `where ${clauses.join(" and ")}` : "";

  const result = await dbQuery<{
    id: string;
    email: string;
    role: AdminRole;
    account_status: AccountStatus;
    email_verified: boolean;
    player_id: string | null;
    registration_name: string | null;
    player_name: string | null;
    membership_status: string | null;
    last_login: Date | null;
    created_at: Date;
    suggested_players: PlayerSuggestion[] | null;
  }>(
    `with filtered_users as (
      select
        u.id,
        u.email,
        u.role,
        u.account_status,
        u.email_verified,
        u.player_id,
        u.registration_name,
        p.display_name as player_name,
        pp.membership_status,
        u.last_login,
        u.created_at
      from users u
      left join players p on p.id = u.player_id
      left join player_profiles pp on pp.player_id = p.id
      ${whereSql}
    )
    select
      fu.*,
      coalesce(suggestions.suggested_players, '[]'::jsonb) as suggested_players
    from filtered_users fu
    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'id', ranked.id,
          'displayName', ranked.display_name,
          'normalizedName', ranked.normalized_name,
          'active', ranked.active,
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
          p.active,
          pp.membership_status,
          (
            select count(*)::int
            from unnest(regexp_split_to_array(
              coalesce(lower(fu.registration_name), lower(split_part(fu.email, '@', 1))),
              '[^a-z]+'
            )) token
            where length(token) > 1 and p.normalized_name like '%' || token || '%'
          ) as match_score
        from players p
        left join player_profiles pp on pp.player_id = p.id
        where fu.player_id is null
          and exists (
            select 1
            from unnest(regexp_split_to_array(
              coalesce(lower(fu.registration_name), lower(split_part(fu.email, '@', 1))),
              '[^a-z]+'
            )) token
            where length(token) > 1 and p.normalized_name like '%' || token || '%'
          )
        order by match_score desc, p.display_name asc
        limit 3
      ) ranked
    ) suggestions on true
    order by
      case fu.account_status when 'pending' then 0 when 'active' then 1 else 2 end,
      fu.created_at desc
    limit 250`,
    values,
  );

  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    accountStatus: row.account_status,
    emailVerified: row.email_verified,
    playerId: row.player_id,
    registrationName: row.registration_name,
    playerName: row.player_name,
    membershipStatus: row.membership_status,
    lastLogin: row.last_login,
    createdAt: row.created_at,
    suggestedPlayers: row.suggested_players ?? [],
  })) satisfies AdminAccountRow[];
}

export async function searchPlayers(query: string) {
  const q = query.trim().toLowerCase();

  if (!q) {
    return [];
  }

  const result = await dbQuery<{
    id: string;
    display_name: string;
    normalized_name: string;
    active: boolean | null;
    membership_status: string | null;
  }>(
    `select
      p.id,
      p.display_name,
      p.normalized_name,
      p.active,
      pp.membership_status
    from players p
    left join player_profiles pp on pp.player_id = p.id
    where lower(p.display_name) like $1 or lower(p.normalized_name) like $1
    order by p.display_name asc
    limit 25`,
    [`%${q}%`],
  );

  return result.rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    normalizedName: row.normalized_name,
    active: row.active,
    membershipStatus: row.membership_status,
  })) satisfies PlayerSearchRow[];
}

async function suggestPlayersForEmail(email: string) {
  const result = await dbQuery<{
    id: string;
    display_name: string;
    normalized_name: string;
    active: boolean | null;
    membership_status: string | null;
    match_score: number;
  }>(
    `select
      p.id,
      p.display_name,
      p.normalized_name,
      p.active,
      pp.membership_status,
      (
        select count(*)::int
        from unnest(regexp_split_to_array(lower(split_part($1, '@', 1)), '[^a-z]+')) token
        where length(token) > 1 and p.normalized_name like '%' || token || '%'
      ) as match_score
    from players p
    left join player_profiles pp on pp.player_id = p.id
    where exists (
      select 1
      from unnest(regexp_split_to_array(lower(split_part($1, '@', 1)), '[^a-z]+')) token
      where length(token) > 1 and p.normalized_name like '%' || token || '%'
    )
    order by match_score desc, p.display_name asc
    limit 8`,
    [email],
  );

  return result.rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    normalizedName: row.normalized_name,
    active: row.active,
    membershipStatus: row.membership_status,
    matchScore: row.match_score,
  })) satisfies PlayerSuggestion[];
}

export async function getAccountDetail(userId: string, playerQuery = "") {
  const userResult = await dbQuery<{
    id: string;
    email: string;
    role: AdminRole;
    account_status: AccountStatus;
    email_verified: boolean;
    player_id: string | null;
    registration_name: string | null;
    player_name: string | null;
    membership_status: string | null;
    last_login: Date | null;
    created_at: Date;
    position: string | null;
    bats: string | null;
    throws: string | null;
    shirt_number: string | null;
    profile_image_url: string | null;
    member_since: string | null;
    profile_created_at: Date | null;
    profile_updated_at: Date | null;
  }>(
    `select
      u.id,
      u.email,
      u.role,
      u.account_status,
      u.email_verified,
      u.player_id,
      u.registration_name,
      p.display_name as player_name,
      pp.membership_status,
      u.last_login,
      u.created_at,
      pp.position,
      pp.bats,
      pp.throws,
      pp.shirt_number::text as shirt_number,
      pp.profile_image_url,
      pp.member_since::text as member_since,
      pp.created_at as profile_created_at,
      pp.updated_at as profile_updated_at
    from users u
    left join players p on p.id = u.player_id
    left join player_profiles pp on pp.player_id = p.id
    where u.id = $1
    limit 1`,
    [userId],
  );
  const row = userResult.rows[0];

  if (!row) {
    return null;
  }

  const [sessionsResult, playerMatches, auditLog, notes] = await Promise.all([
    dbQuery<{
      id: string;
      expires_at: Date;
      created_at: Date;
      last_seen: Date | null;
      device_name: string | null;
      ip_address: string | null;
    }>(
      `select id, expires_at, created_at, last_seen, device_name, ip_address
      from user_sessions
      where user_id = $1 and expires_at > now()
      order by last_seen desc nulls last, created_at desc`,
      [userId],
    ),
    playerQuery
      ? searchPlayers(playerQuery)
      : row.player_id
        ? Promise.resolve([] as PlayerSuggestion[])
        : row.registration_name
          ? searchPlayers(row.registration_name)
          : suggestPlayersForEmail(row.email),
    getAuditLogForAccount(userId),
    getAdminNotesForAccount(userId),
  ]);

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    accountStatus: row.account_status,
    emailVerified: row.email_verified,
    playerId: row.player_id,
    registrationName: row.registration_name,
    playerName: row.player_name,
    membershipStatus: row.membership_status,
    lastLogin: row.last_login,
    createdAt: row.created_at,
    suggestedPlayers: [],
    profile: row.player_id
      ? {
          position: row.position,
          bats: row.bats,
          throws: row.throws,
          shirtNumber: row.shirt_number,
          profileImageUrl: row.profile_image_url,
          membershipStatus: row.membership_status,
          memberSince: row.member_since,
          createdAt: row.profile_created_at,
          updatedAt: row.profile_updated_at,
        }
      : null,
    sessions: sessionsResult.rows.map((session) => ({
      id: session.id,
      expiresAt: session.expires_at,
      createdAt: session.created_at,
      lastSeen: session.last_seen,
      deviceName: session.device_name,
      ipAddress: session.ip_address,
    })),
    playerMatches,
    auditLog,
    notes,
  };
}
