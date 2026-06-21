import "server-only";

// Sends transactional emails via Resend on behalf of the council
const FROM_EMAIL =
  process.env.COUNCIL_FROM_EMAIL ??
  process.env.RESEND_FROM_EMAIL ??
  process.env.PASSWORD_RESET_FROM_EMAIL;

export async function sendCouncilEmail({
  to,
  replyTo,
  cc,
  subject,
  html,
  text,
}: {
  to: string;
  replyTo?: string;
  cc?: string | string[];
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !FROM_EMAIL) {
    throw new Error("Resend is not configured (RESEND_API_KEY / FROM_EMAIL missing)");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      reply_to: replyTo,
      cc,
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}
