import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasTreasurerAccess } from "@/lib/council-session";
import { councilQuery } from "@/db/council-db";
import { mainQuery } from "@/lib/main-db";
import { sendCouncilEmail } from "@/lib/email";
import { getStripe } from "@/lib/stripe";
import { updatePlayerFeeStripeLink } from "@/lib/treasurer-queries";
import { buildFeeEmail, type ReminderType } from "@/lib/fee-emails";

const COUNCIL_BASE_URL = process.env.COUNCIL_BASE_URL ?? "http://localhost:3001";
const STRIPE_LINK_TTL_SECONDS = 23 * 60 * 60; // 23 h (Stripe max is 24 h)

export async function POST(req: NextRequest) {
  try {
  const user = await getCouncilUser();
  if (!user || !hasTreasurerAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { playerFeeId?: string; type?: string };
  const { playerFeeId } = body;
  const type = (body.type ?? "reminder") as ReminderType;

  if (!playerFeeId) {
    return NextResponse.json({ error: "playerFeeId required" }, { status: 400 });
  }
  if (!["initial", "reminder", "overdue"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const feeRes = await councilQuery<{
    user_id: string;
    player_name: string;
    fee_type: string;
    season_id: string;
    amount_due: string;
    amount_paid: string;
    season_label: string;
    due_date: string | null;
    stripe_session_id: string | null;
    stripe_link_expires_at: Date | null;
  }>(
    `SELECT pf.user_id, pf.player_name, pf.fee_type, pf.season_id,
            pf.amount_due::text, COALESCE(SUM(fp.amount), 0)::text AS amount_paid,
            fs.label AS season_label, fs.due_date::text,
            pf.stripe_session_id, pf.stripe_link_expires_at
     FROM player_fees pf
     JOIN fee_seasons fs ON fs.id = pf.season_id
     LEFT JOIN fee_payments fp ON fp.player_fee_id = pf.id
     WHERE pf.id = $1
     GROUP BY pf.user_id, pf.player_name, pf.fee_type, pf.season_id, pf.amount_due,
              fs.label, fs.due_date, pf.stripe_session_id, pf.stripe_link_expires_at`,
    [playerFeeId]
  );

  if (feeRes.rows.length === 0) {
    return NextResponse.json({ error: "Fee record not found" }, { status: 404 });
  }

  const fee = feeRes.rows[0];
  const amountDue = parseFloat(fee.amount_due);
  const amountPaid = parseFloat(fee.amount_paid);
  const outstanding = amountDue - amountPaid;

  const userRes = await mainQuery<{ email: string }>(
    `SELECT email FROM users WHERE id = $1 AND account_status = 'active'`,
    [fee.user_id]
  );

  if (userRes.rows.length === 0) {
    return NextResponse.json({ error: "No active account found for this player" }, { status: 404 });
  }

  const email = userRes.rows[0].email;

  // Cancel the previous Stripe session if it's still active, to avoid stale duplicate links
  if (fee.stripe_session_id && fee.stripe_link_expires_at && fee.stripe_link_expires_at > new Date()) {
    try {
      await getStripe().checkout.sessions.expire(fee.stripe_session_id);
    } catch {
      // Session may already be paid/cancelled — safe to ignore
    }
  }

  const dueDateStr = fee.due_date
    ? new Date(fee.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const feeTypeLabel = fee.fee_type === "rookie" ? "Rookie fee" : fee.fee_type === "umpire" ? "Umpire fee" : "Player fee";
  const expiresAt = Math.floor(Date.now() / 1000) + STRIPE_LINK_TTL_SECONDS;

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [{
      price_data: {
        currency: "gbp",
        unit_amount: Math.round(outstanding * 100),
        product_data: {
          name: `${fee.season_label} — ${feeTypeLabel}`,
          description: `Membership fee for ${fee.player_name}`,
        },
      },
      quantity: 1,
    }],
    metadata: {
      playerFeeId,
      playerName: fee.player_name,
      seasonId: fee.season_id,
    },
    success_url: `${COUNCIL_BASE_URL}/payment-confirmed?name=${encodeURIComponent(fee.player_name)}&amount=${outstanding.toFixed(2)}`,
    cancel_url: `${COUNCIL_BASE_URL}/treasurer/fees/${fee.season_id}`,
  });

  await updatePlayerFeeStripeLink(playerFeeId, new Date(), new Date(expiresAt * 1000), session.id);

  const { subject, html, text } = buildFeeEmail(
    type, fee.player_name, fee.season_label,
    amountDue, amountPaid, outstanding, dueDateStr, session.url!,
  );

  try {
    await sendCouncilEmail({ to: email, subject, html, text });
  } catch (err) {
    console.error("Fee reminder email error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("Fee remind route error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
