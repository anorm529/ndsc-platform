import "server-only";

import { performance } from "node:perf_hooks";
import { dbQuery, isDatabaseConfigured, validateDatabaseUrl } from "@/lib/db";
import { getEmailDeliveryOverview } from "@/lib/email-events";

type Tone = "success" | "warning" | "danger" | "neutral";

export type OverviewMetric = {
  label: string;
  value: string;
  tone: Tone;
};

export type OverviewFlag = {
  label: string;
  detail: string;
  href?: string;
  tone: Exclude<Tone, "neutral">;
};

export type OverviewTableCount = {
  tableName: string;
  exists: boolean;
  count: number | null;
};

export type AdminOverview = {
  configured: boolean;
  error?: string;
  checkedAt: Date;
  connectionMs: number | null;
  metrics: OverviewMetric[];
  flags: OverviewFlag[];
  tables: OverviewTableCount[];
};

const overviewTables = [
  "users",
  "user_sessions",
  "players",
  "player_profiles",
  "password_reset_tokens",
  "admin_audit_log",
  "admin_notes",
  "email_events",
];

function quoteIdent(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function getTableCount(tableName: string) {
  const existsResult = await dbQuery<{ exists: boolean }>(
    "select to_regclass($1) is not null as exists",
    [`public.${tableName}`],
  );
  const exists = Boolean(existsResult.rows[0]?.exists);

  if (!exists) {
    return { tableName, exists, count: null } satisfies OverviewTableCount;
  }

  const countResult = await dbQuery<{ count: string }>(
    `select count(*)::text as count from public.${quoteIdent(tableName)}`,
  );

  return {
    tableName,
    exists,
    count: Number(countResult.rows[0]?.count ?? 0),
  } satisfies OverviewTableCount;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const checkedAt = new Date();
  const validationError = validateDatabaseUrl();

  if (!isDatabaseConfigured() || validationError) {
    return {
      configured: false,
      error: validationError || "DATABASE_URL is not configured.",
      checkedAt,
      connectionMs: null,
      metrics: [],
      flags: [
        {
          label: "Database unavailable",
          detail: validationError || "DATABASE_URL is not configured.",
          tone: "danger",
        },
      ],
      tables: [],
    };
  }

  const start = performance.now();
  const [tables, accountStats, profileStats, sessionStats, resetStats, emailOverview] =
    await Promise.all([
      Promise.all(overviewTables.map((tableName) => getTableCount(tableName))),
      dbQuery<{
        total_users: string;
        pending_users: string;
        active_users: string;
        disabled_users: string;
        owners: string;
        admins: string;
        players: string;
        unlinked_users: string;
      }>(
        `select
          count(*)::text as total_users,
          count(*) filter (where account_status = 'pending')::text as pending_users,
          count(*) filter (where account_status = 'active')::text as active_users,
          count(*) filter (where account_status = 'disabled')::text as disabled_users,
          count(*) filter (where role = 'owner')::text as owners,
          count(*) filter (where role = 'admin')::text as admins,
          count(*) filter (where role = 'player')::text as players,
          count(*) filter (where player_id is null)::text as unlinked_users
        from users`,
      ),
      dbQuery<{
        total_players: string;
        active_players: string;
        inactive_players: string;
        profiles: string;
        players_without_profiles: string;
      }>(
        `select
          count(p.*)::text as total_players,
          count(p.*) filter (where p.active is true)::text as active_players,
          count(p.*) filter (where p.active is false)::text as inactive_players,
          count(pp.*)::text as profiles,
          count(p.*) filter (where pp.player_id is null)::text as players_without_profiles
        from players p
        left join player_profiles pp on pp.player_id = p.id`,
      ),
      dbQuery<{
        active_sessions: string;
        stale_sessions: string;
      }>(
        `select
          count(*) filter (where expires_at > now())::text as active_sessions,
          count(*) filter (where expires_at <= now())::text as stale_sessions
        from user_sessions`,
      ),
      dbQuery<{
        active_reset_tokens: string;
        expired_unused_reset_tokens: string;
      }>(
        `select
          count(*) filter (where used_at is null and expires_at > now())::text as active_reset_tokens,
          count(*) filter (where used_at is null and expires_at <= now())::text as expired_unused_reset_tokens
        from password_reset_tokens`,
      ),
      getEmailDeliveryOverview(),
    ]);

  const connectionMs = Math.round(performance.now() - start);
  const accounts = accountStats.rows[0];
  const profiles = profileStats.rows[0];
  const sessions = sessionStats.rows[0];
  const resets = resetStats.rows[0];
  const missingTables = tables.filter((table) => !table.exists);
  const pendingUsers = Number(accounts?.pending_users ?? 0);
  const unlinkedUsers = Number(accounts?.unlinked_users ?? 0);
  const disabledUsers = Number(accounts?.disabled_users ?? 0);
  const playersWithoutProfiles = Number(profiles?.players_without_profiles ?? 0);
  const activeResetTokens = Number(resets?.active_reset_tokens ?? 0);
  const expiredResetTokens = Number(resets?.expired_unused_reset_tokens ?? 0);
  const staleSessions = Number(sessions?.stale_sessions ?? 0);

  const flags: OverviewFlag[] = [];

  if (missingTables.length) {
    flags.push({
      label: "Missing tables",
      detail: missingTables.map((table) => table.tableName).join(", "),
      tone: "danger",
      href: "/members/admin/database",
    });
  }

  if (pendingUsers) {
    flags.push({
      label: "Pending approvals",
      detail: `${pendingUsers} account${pendingUsers === 1 ? "" : "s"} waiting`,
      tone: "warning",
      href: "/admin/accounts?status=pending",
    });
  }

  if (unlinkedUsers) {
    flags.push({
      label: "Unlinked accounts",
      detail: `${unlinkedUsers} user${unlinkedUsers === 1 ? "" : "s"} not linked to a player`,
      tone: "warning",
      href: "/admin/accounts?link=unlinked",
    });
  }

  if (playersWithoutProfiles) {
    flags.push({
      label: "Missing profiles",
      detail: `${playersWithoutProfiles} player${playersWithoutProfiles === 1 ? "" : "s"} without profile metadata`,
      tone: "warning",
      href: "/members/admin/players",
    });
  }

  if (expiredResetTokens || staleSessions) {
    flags.push({
      label: "Cleanup available",
      detail: `${expiredResetTokens} expired reset token${expiredResetTokens === 1 ? "" : "s"}, ${staleSessions} stale session${staleSessions === 1 ? "" : "s"}`,
      tone: "warning",
      href: "/admin/cleanup",
    });
  }

  if (!emailOverview.configured) {
    flags.push({
      label: "Resend not fully configured",
      detail: "Check RESEND_API_KEY and PASSWORD_RESET_FROM_EMAIL.",
      tone: "warning",
      href: "/admin/email",
    });
  }

  if (!emailOverview.tableReady) {
    flags.push({
      label: "Email event table missing",
      detail: "Run the email_events migration to track reset email delivery.",
      tone: "warning",
      href: "/admin/email",
    });
  }

  if (emailOverview.resetFailed24h || emailOverview.resetBounced7d) {
    flags.push({
      label: "Email delivery issues",
      detail: `${emailOverview.resetFailed24h} failed in 24h, ${emailOverview.resetBounced7d} bounced in 7d`,
      tone: "warning",
      href: "/admin/email",
    });
  }

  if (!flags.length) {
    flags.push({
      label: "No urgent flags",
      detail: "Accounts, links, profiles, and sessions look settled.",
      tone: "success",
    });
  }

  return {
    configured: true,
    checkedAt,
    connectionMs,
    metrics: [
      {
        label: "Neon connection",
        value: `${connectionMs}ms`,
        tone: connectionMs > 1500 ? "warning" : "success",
      },
      {
        label: "Users",
        value: Number(accounts?.total_users ?? 0).toLocaleString("en-GB"),
        tone: "neutral",
      },
      {
        label: "Pending",
        value: pendingUsers.toLocaleString("en-GB"),
        tone: pendingUsers ? "warning" : "success",
      },
      {
        label: "Unlinked",
        value: unlinkedUsers.toLocaleString("en-GB"),
        tone: unlinkedUsers ? "warning" : "success",
      },
      {
        label: "Disabled",
        value: disabledUsers.toLocaleString("en-GB"),
        tone: disabledUsers ? "warning" : "success",
      },
      {
        label: "Active sessions",
        value: Number(sessions?.active_sessions ?? 0).toLocaleString("en-GB"),
        tone: "neutral",
      },
      {
        label: "Reset tokens",
        value: activeResetTokens.toLocaleString("en-GB"),
        tone: activeResetTokens ? "warning" : "success",
      },
      {
        label: "Reset emails 24h",
        value: emailOverview.resetSent24h.toLocaleString("en-GB"),
        tone: emailOverview.resetFailed24h ? "warning" : "neutral",
      },
    ],
    flags,
    tables,
  };
}
