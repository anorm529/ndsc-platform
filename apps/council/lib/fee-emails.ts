import "server-only";

export type ReminderType = "initial" | "reminder" | "overdue";

export function fmtGBP(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

export function buildFeeEmail(
  type: ReminderType,
  name: string,
  seasonLabel: string,
  amountDue: number,
  amountPaid: number,
  outstanding: number,
  dueDateStr: string | null,
  paymentUrl: string,
): { subject: string; html: string; text: string } {
  const headerColour = type === "overdue" ? "#dc2626" : type === "reminder" ? "#d97706" : "#0d9488";

  const intro = {
    initial:  `Your membership fee for the <strong>${seasonLabel}</strong> season has been set. Here is a breakdown of what you owe${dueDateStr ? " and when payment is due" : ""}.`,
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
            <td style="padding:8px 0;text-align:right;font-weight:600">${fmtGBP(amountDue)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px">Paid to date</td>
            <td style="padding:8px 0;text-align:right;font-weight:600">${fmtGBP(amountPaid)}</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0">
            <td style="padding:8px 0;font-weight:700">Outstanding</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#dc2626">${fmtGBP(outstanding)}</td>
          </tr>
        </table>
        ${dueDateStr && type !== "overdue" ? `<p style="font-size:13px;color:#64748b">Payment due by <strong>${dueDateStr}</strong>.</p>` : ""}
        <p>${closing}</p>
        <div style="margin:24px 0;text-align:center">
          <a href="${paymentUrl}"
             style="display:inline-block;background:${headerColour};color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none">
            Pay now — ${fmtGBP(outstanding)}
          </a>
        </div>
        <p style="font-size:12px;color:#94a3b8">Or copy this link into your browser:<br>${paymentUrl}</p>
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
    `Fee: ${fmtGBP(amountDue)}`,
    `Paid: ${fmtGBP(amountPaid)}`,
    `Outstanding: ${fmtGBP(outstanding)}`,
    dueDateStr && type !== "overdue" ? `\nPayment due by ${dueDateStr}.` : "",
    "",
    closing,
    "",
    `Pay now: ${paymentUrl}`,
    "",
    "— North Down Softball Club Council",
  ].filter((l) => l !== undefined).join("\n");

  return { subject, html, text };
}
