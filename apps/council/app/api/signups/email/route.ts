import { NextRequest, NextResponse } from "next/server";
import { requireCouncilUser } from "@/lib/council-session";
import { councilQuery } from "@/db/council-db";
import { sendCouncilEmail } from "@/lib/email";
import { getMemberById, memberDisplayName } from "@/lib/main-db";

type SignupRow = {
  id: string;
  type: "player" | "team";
  name: string;
  email: string;
  team_name: string | null;
};

export async function POST(req: NextRequest) {
  let sender: Awaited<ReturnType<typeof requireCouncilUser>>;
  try {
    sender = await requireCouncilUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { signupId?: string; subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { signupId, subject, message } = body;
  if (!signupId || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "signupId, subject, and message are required" }, { status: 422 });
  }

  const { rows } = await councilQuery<SignupRow>(
    `SELECT id, type, name, email, team_name FROM tournament_interest WHERE id = $1`,
    [signupId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "Signup not found" }, { status: 404 });
  }

  const signup = rows[0];
  const recipientName = signup.type === "team" ? signup.team_name ?? signup.name : signup.name;

  const senderMember = await getMemberById(sender.id);
  const senderName = senderMember ? memberDisplayName(senderMember) : sender.email;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2B2254;max-width:560px">
      <div style="background:#2B2254;padding:20px 24px;border-radius:10px 10px 0 0">
        <p style="margin:0;color:#ff79ca;font-size:13px;text-transform:uppercase;letter-spacing:0.1em">North Down Softball Club</p>
        <p style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:900;font-style:italic;text-transform:uppercase">Women's Tournament 2027</p>
      </div>
      <div style="background:#f9f6ff;padding:24px;border-radius:0 0 10px 10px;border:2px solid #2B2254;border-top:none">
        <p>Hi ${recipientName},</p>
        ${message.trim().split("\n").map((line) => `<p style="margin:0 0 10px">${line}</p>`).join("")}
        <p style="margin-top:20px;color:#7c6fa0;font-size:13px;border-top:1px solid #e8e0f5;padding-top:16px">
          This email was sent by ${senderName} on behalf of North Down Softball Club.<br/>
          Reply to this email to respond directly.
        </p>
      </div>
    </div>
  `;

  const text = `Hi ${recipientName},\n\n${message.trim()}\n\n---\nSent by ${senderName} on behalf of North Down Softball Club. Reply to this email to respond directly.`;

  try {
    await sendCouncilEmail({
      to: signup.email,
      replyTo: "northdownsoftballclub@gmail.com",
      cc: "anorman529@gmail.com",
      subject: subject.trim(),
      html,
      text,
    });
  } catch (err) {
    console.error("Council email error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  // Mark as contacted if still new
  await councilQuery(
    `UPDATE tournament_interest SET status = 'contacted' WHERE id = $1 AND status = 'new'`,
    [signupId]
  );

  return NextResponse.json({ ok: true });
}
