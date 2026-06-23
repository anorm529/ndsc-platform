import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasTreasurerAccess } from "@/lib/council-session";
import { councilQuery } from "@/db/council-db";
import { mainQuery } from "@/lib/main-db";
import { sendCouncilEmail } from "@/lib/email";

type ReminderType = "initial" | "reminder" | "overdue";

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

function buildEmail(
  type: ReminderType,
  name: string,
  seasonLabel: string,
  amountDue: number,
  amountPaid: number,
  outstanding: number,
  dueDateStr: string | null,
): { subject: string; html: string; text: string } {
  const headerColour = type === "overdue" ? "#dc2626" : type === "reminder" ? "#d97706" : "#0d9488";

  const intro = {
    initial:  `Your membership fee for the <strong>${seasonLabel}</strong> season has been set. Here is a breakdown of what you owe${dueDateStr ? ` and when payment is due` : ""}.`,
    reminder: `This is a friendly reminder that your membership fee for the <strong>${seasonLabel}</strong> season is due soon${dueDateStr ? ` on <strong>${dueDateStr}</strong>` : ""}. You still have an outstanding balance.`,
    overdue:  `Your membership fee for the <strong>${seasonLabel}</strong> season${dueDateStr ? ` was due on <strong>${dueDateStr}</strong> and` : ""} is now <strong>overdue</strong>. Please note that you are <strong>ineligible for games</strong> until your fees are paid in full.`,
  }[type];

  const headerTitle = {
    initial:  "Membership fee notice",
    reminder: "Membership fee reminder",
    overdue:  "Membership fee overdue",
  }[type];

  const subject = {
    initial:  `Membership fee notice — ${seasonLabel}`,
    reminder: `Reminder: membership fees due soon — ${seasonLabel}`,
    overdue:  `Overdue: membership fees — ${seasonLabel}`,
  }[type];

  const closing = type === "overdue"
    ? "Please arrange payment as soon as possible to restore your game eligibility. Reply to this email if you have any questions."
    : "Please arrange payment at your earliest convenience. Reply to this email if you have any questions.";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:580px">
      <div style="background:${headerColour};padding:18px 24px;border-radius:10px 10px 0 0">
        <p style="margin:0;color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:0.08em">North Down Softball Club</p>
        <p style="margin:4px 0 0;color:#fff;font-size:17px;font-weight:700">${headerTitle}</p>
      </div>
      <div style="background:#f8fafc;padding:24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:none">
        <p>Hi ${name},</p>
        <p>${intro}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px">Fee</td>
            <td style="padding:8px 0;text-align:right;font-weight:600">${fmt(amountDue)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px">Paid to date</td>
            <td style="padding:8px 0;text-align:right;font-weight:600">${fmt(amountPaid)}</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0">
            <td style="padding:8px 0;font-weight:700">Outstanding</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#dc2626">${fmt(outstanding)}</td>
          </tr>
        </table>
        ${dueDateStr && type !== "overdue" ? `<p style="font-size:13px;color:#64748b">Payment due by <strong>${dueDateStr}</strong>.</p>` : ""}
        <p>${closing}</p>
        <p style="margin-top:20px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:16px">
          North Down Softball Club — Council
        </p>
      </div>
    </div>
  `;

  const text = [
    `Hi ${name},`,
    "",
    {
      initial:  `Your membership fee for the ${seasonLabel} season has been set.`,
      reminder: `This is a friendly reminder that your membership fee for ${seasonLabel} is due soon${dueDateStr ? ` on ${dueDateStr}` : ""}.`,
      overdue:  `Your membership fee for ${seasonLabel} is now overdue. You are ineligible for games until fees are paid in full.`,
    }[type],
    "",
    `Fee: ${fmt(amountDue)}`,
    `Paid: ${fmt(amountPaid)}`,
    `Outstanding: ${fmt(outstanding)}`,
    dueDateStr && type !== "overdue" ? `\nPayment due by ${dueDateStr}.` : "",
    "",
    closing,
    "",
    "— North Down Softball Club Council",
  ].filter((l) => l !== undefined).join("\n");

  return { subject, html, text };
}

export async function POST(req: NextRequest) {
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
    amount_due: string;
    amount_paid: string;
    season_label: string;
    due_date: string | null;
  }>(
    `SELECT pf.user_id, pf.player_name,
            pf.amount_due::text, COALESCE(SUM(fp.amount), 0)::text AS amount_paid,
            fs.label AS season_label, fs.due_date::text
     FROM player_fees pf
     JOIN fee_seasons fs ON fs.id = pf.season_id
     LEFT JOIN fee_payments fp ON fp.player_fee_id = pf.id
     WHERE pf.id = $1
     GROUP BY pf.user_id, pf.player_name, pf.amount_due, fs.label, fs.due_date`,
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
  const dueDateStr = fee.due_date
    ? new Date(fee.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const { subject, html, text } = buildEmail(type, fee.player_name, fee.season_label, amountDue, amountPaid, outstanding, dueDateStr);

  try {
    await sendCouncilEmail({ to: email, subject, html, text });
  } catch (err) {
    console.error("Fee reminder email error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
