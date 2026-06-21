import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasTreasurerAccess } from "@/lib/council-session";
import { councilQuery } from "@/db/council-db";
import { mainQuery } from "@/lib/main-db";
import { sendCouncilEmail } from "@/lib/email";

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasTreasurerAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { playerFeeId } = await req.json() as { playerFeeId?: string };
  if (!playerFeeId) {
    return NextResponse.json({ error: "playerFeeId required" }, { status: 400 });
  }

  // Get fee record
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

  // Look up the player's email in the main DB
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

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:580px">
      <div style="background:#0d9488;padding:18px 24px;border-radius:10px 10px 0 0">
        <p style="margin:0;color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:0.08em">North Down Softball Club</p>
        <p style="margin:4px 0 0;color:#fff;font-size:17px;font-weight:700">Membership fee reminder</p>
      </div>
      <div style="background:#f8fafc;padding:24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:none">
        <p>Hi ${fee.player_name},</p>
        <p>This is a friendly reminder that your membership fee for the <strong>${fee.season_label}</strong> season is outstanding.</p>
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
        ${dueDateStr ? `<p style="color:#dc2626;font-size:13px">Payment due by ${dueDateStr}.</p>` : ""}
        <p>Please arrange payment at your earliest convenience. Reply to this email if you have any questions.</p>
        <p style="margin-top:20px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:16px">
          North Down Softball Club — Council
        </p>
      </div>
    </div>
  `;

  const text = `Hi ${fee.player_name},\n\nThis is a friendly reminder that your membership fee for ${fee.season_label} is outstanding.\n\nFee: ${fmt(amountDue)}\nPaid: ${fmt(amountPaid)}\nOutstanding: ${fmt(outstanding)}\n${dueDateStr ? `\nPayment due by ${dueDateStr}.\n` : ""}\nPlease arrange payment at your earliest convenience.\n\n— North Down Softball Club Council`;

  try {
    await sendCouncilEmail({
      to: email,
      subject: `Membership fee reminder — ${fee.season_label}`,
      html,
      text,
    });
  } catch (err) {
    console.error("Fee reminder email error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
