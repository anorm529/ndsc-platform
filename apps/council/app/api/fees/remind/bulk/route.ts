import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasTreasurerAccess } from "@/lib/council-session";
import { councilQuery } from "@/db/council-db";
import { mainQuery } from "@/lib/main-db";
import { sendCouncilEmail } from "@/lib/email";
import { stripe } from "@/lib/stripe";
import { updatePlayerFeeStripeLink } from "@/lib/treasurer-queries";
import { buildFeeEmail, type ReminderType } from "@/lib/fee-emails";

const COUNCIL_BASE_URL = process.env.COUNCIL_BASE_URL ?? "http://localhost:3001";
const STRIPE_LINK_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasTreasurerAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { seasonId?: string; type?: string };
  const { seasonId } = body;
  const type = (body.type ?? "initial") as ReminderType;

  if (!seasonId) return NextResponse.json({ error: "seasonId required" }, { status: 400 });
  if (!["initial", "reminder", "overdue"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  // Get all player fees for the season that still have an outstanding balance
  const feesRes = await councilQuery<{
    id: string;
    user_id: string | null;
    player_name: string;
    fee_type: string;
    season_id: string;
    amount_due: string;
    amount_paid: string;
    season_label: string;
    due_date: string | null;
  }>(
    `SELECT pf.id, pf.user_id, pf.player_name, pf.fee_type, pf.season_id,
            pf.amount_due::text, COALESCE(SUM(fp.amount), 0)::text AS amount_paid,
            fs.label AS season_label, fs.due_date::text
     FROM player_fees pf
     JOIN fee_seasons fs ON fs.id = pf.season_id
     LEFT JOIN fee_payments fp ON fp.player_fee_id = pf.id
     WHERE pf.season_id = $1
     GROUP BY pf.id, pf.user_id, pf.player_name, pf.fee_type, pf.season_id,
              pf.amount_due, fs.label, fs.due_date
     HAVING pf.amount_due > COALESCE(SUM(fp.amount), 0)`,
    [seasonId]
  );

  const fees = feesRes.rows;
  if (fees.length === 0) return NextResponse.json({ sent: 0, skipped: 0, errors: [] });

  // Batch-resolve active accounts in one query
  const userIds = fees.map((f) => f.user_id).filter(Boolean) as string[];
  const activeEmailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const usersRes = await mainQuery<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE id = ANY($1::uuid[]) AND account_status = 'active'`,
      [userIds]
    );
    for (const u of usersRes.rows) activeEmailMap.set(u.id, u.email);
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const fee of fees) {
    if (!fee.user_id || !activeEmailMap.has(fee.user_id)) {
      skipped++;
      continue;
    }

    const email = activeEmailMap.get(fee.user_id)!;
    const amountDue = parseFloat(fee.amount_due);
    const amountPaid = parseFloat(fee.amount_paid);
    const outstanding = amountDue - amountPaid;

    try {
      const feeTypeLabel = fee.fee_type === "rookie" ? "Rookie fee" : fee.fee_type === "umpire" ? "Umpire fee" : "Player fee";
      const expiresAt = Math.floor(Date.now() / 1000) + STRIPE_LINK_TTL_SECONDS;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        expires_at: expiresAt,
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
          playerFeeId: fee.id,
          playerName: fee.player_name,
          seasonId: fee.season_id,
        },
        success_url: `${COUNCIL_BASE_URL}/payment-confirmed`,
        cancel_url: `${COUNCIL_BASE_URL}/treasurer/fees/${fee.season_id}`,
      });

      await updatePlayerFeeStripeLink(fee.id, new Date(), new Date(expiresAt * 1000));

      const dueDateStr = fee.due_date
        ? new Date(fee.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : null;

      const { subject, html, text } = buildFeeEmail(
        type, fee.player_name, fee.season_label,
        amountDue, amountPaid, outstanding, dueDateStr, session.url!,
      );

      await sendCouncilEmail({ to: email, subject, html, text });
      sent++;
    } catch (err) {
      console.error(`Bulk send error for ${fee.player_name}:`, err);
      errors.push(fee.player_name);
    }
  }

  return NextResponse.json({ sent, skipped, errors });
}
