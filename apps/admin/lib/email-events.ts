import "server-only";

import { dbQuery } from "@/lib/db";

export type EmailEventStatus = "sent" | "failed" | "delivered" | "bounced";
export type EmailEventType = "password_reset" | "email_verification" | "admin_notification";

export type EmailEventRow = {
  id: string;
  userId: string | null;
  email: string;
  type: string;
  provider: string;
  providerMessageId: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
};

function isMissingTableError(error: unknown) {
  return typeof error === "object" && error && "code" in error && error.code === "42P01";
}

export function getEmailProviderConfig() {
  return {
    provider: "resend",
    apiKeyConfigured: Boolean(process.env.RESEND_API_KEY),
    fromEmailConfigured: Boolean(process.env.PASSWORD_RESET_FROM_EMAIL),
    fromEmail: process.env.PASSWORD_RESET_FROM_EMAIL || "",
  };
}

export async function logEmailEvent({
  userId,
  email,
  type,
  providerMessageId,
  status,
  errorMessage,
}: {
  userId?: string | null;
  email: string;
  type: EmailEventType | string;
  providerMessageId?: string | null;
  status: EmailEventStatus | string;
  errorMessage?: string | null;
}) {
  try {
    await dbQuery(
      `insert into email_events (
        user_id,
        email,
        type,
        provider,
        provider_message_id,
        status,
        error_message
      )
      values ($1, $2, $3, 'resend', $4, $5, $6)`,
      [
        userId ?? null,
        email,
        type,
        providerMessageId ?? null,
        status,
        errorMessage ?? null,
      ],
    );
  } catch (error) {
    if (isMissingTableError(error)) {
      return;
    }

    throw error;
  }
}

export async function getEmailDeliveryOverview() {
  const config = getEmailProviderConfig();

  try {
    const [summary, recent] = await Promise.all([
      dbQuery<{
        reset_sent_24h: string;
        reset_failed_24h: string;
        reset_bounced_7d: string;
        reset_delivered_7d: string;
        reset_sent_7d: string;
        last_reset_sent_at: Date | null;
        repeat_request_users_7d: string;
      }>(
        `with reset_events as (
          select *
          from email_events
          where type = 'password_reset'
        ),
        repeat_users as (
          select user_id
          from reset_events
          where created_at >= now() - interval '7 days'
            and user_id is not null
          group by user_id
          having count(*) >= 3
        )
        select
          count(*) filter (where status = 'sent' and created_at >= now() - interval '24 hours')::text as reset_sent_24h,
          count(*) filter (where status = 'failed' and created_at >= now() - interval '24 hours')::text as reset_failed_24h,
          count(*) filter (where status = 'bounced' and created_at >= now() - interval '7 days')::text as reset_bounced_7d,
          count(*) filter (where status = 'delivered' and created_at >= now() - interval '7 days')::text as reset_delivered_7d,
          count(*) filter (where status = 'sent' and created_at >= now() - interval '7 days')::text as reset_sent_7d,
          max(created_at) filter (where status = 'sent') as last_reset_sent_at,
          (select count(*)::text from repeat_users) as repeat_request_users_7d
        from reset_events`,
      ),
      dbQuery<{
        id: string;
        user_id: string | null;
        email: string;
        type: string;
        provider: string;
        provider_message_id: string | null;
        status: string;
        error_message: string | null;
        created_at: Date;
      }>(
        `select
          id,
          user_id,
          email,
          type,
          provider,
          provider_message_id,
          status,
          error_message,
          created_at
        from email_events
        order by created_at desc
        limit 50`,
      ),
    ]);

    const row = summary.rows[0];

    return {
      configured: config.apiKeyConfigured && config.fromEmailConfigured,
      config,
      tableReady: true,
      resetSent24h: Number(row?.reset_sent_24h ?? 0),
      resetFailed24h: Number(row?.reset_failed_24h ?? 0),
      resetBounced7d: Number(row?.reset_bounced_7d ?? 0),
      resetDelivered7d: Number(row?.reset_delivered_7d ?? 0),
      resetSent7d: Number(row?.reset_sent_7d ?? 0),
      repeatRequestUsers7d: Number(row?.repeat_request_users_7d ?? 0),
      lastResetSentAt: row?.last_reset_sent_at ?? null,
      recentEvents: recent.rows.map((event) => ({
        id: event.id,
        userId: event.user_id,
        email: event.email,
        type: event.type,
        provider: event.provider,
        providerMessageId: event.provider_message_id,
        status: event.status,
        errorMessage: event.error_message,
        createdAt: event.created_at,
      })) satisfies EmailEventRow[],
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      return {
        configured: config.apiKeyConfigured && config.fromEmailConfigured,
        config,
        tableReady: false,
        resetSent24h: 0,
        resetFailed24h: 0,
        resetBounced7d: 0,
        resetDelivered7d: 0,
        resetSent7d: 0,
        repeatRequestUsers7d: 0,
        lastResetSentAt: null,
        recentEvents: [],
      };
    }

    throw error;
  }
}
