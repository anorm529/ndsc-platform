import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser } from "@/lib/council-session";
import { saveAnnouncement } from "@/lib/council-queries";
import { sendCouncilEmail } from "@/lib/email";
import { mainQuery } from "@/lib/main-db";
import { getAllTeams } from "@/lib/season-queries";

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { subject, body, recipients, teamId } = await req.json() as {
    subject?: string;
    body?: string;
    recipients?: string;
    teamId?: string | null;
  };

  if (!subject?.trim() || !body?.trim() || !recipients) {
    return NextResponse.json({ error: "subject, body, and recipients required" }, { status: 400 });
  }

  const VALID_RECIPIENTS = ["all_enrolled", "all_captains", "all_council", "team"];
  if (!VALID_RECIPIENTS.includes(recipients)) {
    return NextResponse.json({ error: "Invalid recipients" }, { status: 400 });
  }
  if (recipients === "team" && !teamId) {
    return NextResponse.json({ error: "teamId required when recipients=team" }, { status: 400 });
  }

  // Resolve email addresses
  let emailList: { name: string; email: string }[] = [];
  let teamName: string | null = null;

  if (recipients === "all_council") {
    const res = await mainQuery<{
      email: string; registration_name: string | null; display_name: string | null;
    }>(
      `SELECT u.email, u.registration_name, p.display_name
       FROM users u
       LEFT JOIN players p ON p.id = u.player_id
       WHERE u.account_status = 'active'
         AND EXISTS (
           SELECT 1 FROM app_permissions ap
           WHERE ap.user_id = u.id AND ap.app = 'council'
         )
       ORDER BY u.email ASC`
    );
    emailList = res.rows.map((r) => ({
      name: r.registration_name ?? r.display_name ?? r.email.split("@")[0],
      email: r.email,
    }));
  } else if (recipients === "all_captains") {
    const res = await mainQuery<{
      email: string; registration_name: string | null; display_name: string | null;
    }>(
      `SELECT u.email, u.registration_name, p.display_name
       FROM users u
       LEFT JOIN players p ON p.id = u.player_id
       WHERE u.account_status = 'active'
         AND EXISTS (
           SELECT 1 FROM app_permissions ap
           WHERE ap.user_id = u.id AND ap.app = 'council'
             AND ap.permission = 'captain'
         )
       ORDER BY u.email ASC`
    );
    emailList = res.rows.map((r) => ({
      name: r.registration_name ?? r.display_name ?? r.email.split("@")[0],
      email: r.email,
    }));
  } else if (recipients === "all_enrolled") {
    // Active season enrollments with a linked user account
    const res = await mainQuery<{
      email: string; registration_name: string | null; display_name: string | null;
    }>(
      `SELECT DISTINCT u.email, u.registration_name, p.display_name
       FROM season_enrollments se
       JOIN seasons s ON s.id = se.season_id AND s.is_active = true
       JOIN players p ON p.id = se.player_id
       JOIN users u ON u.player_id = p.id
       WHERE u.account_status = 'active'
       ORDER BY u.email ASC`
    );
    emailList = res.rows.map((r) => ({
      name: r.registration_name ?? r.display_name ?? r.email.split("@")[0],
      email: r.email,
    }));
  } else if (recipients === "team" && teamId) {
    const res = await mainQuery<{
      email: string; registration_name: string | null; display_name: string | null;
    }>(
      `SELECT DISTINCT u.email, u.registration_name, p.display_name
       FROM season_enrollments se
       JOIN seasons s ON s.id = se.season_id AND s.is_active = true
       JOIN players p ON p.id = se.player_id
       JOIN users u ON u.player_id = p.id
       WHERE se.current_team_id = $1
         AND u.account_status = 'active'
       ORDER BY u.email ASC`,
      [teamId]
    );
    emailList = res.rows.map((r) => ({
      name: r.registration_name ?? r.display_name ?? r.email.split("@")[0],
      email: r.email,
    }));
    const teams = await getAllTeams();
    teamName = teams.find((t) => t.id === teamId)?.name ?? null;
  }

  // Send emails
  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of emailList) {
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:580px">
        <div style="background:#0d9488;padding:18px 24px;border-radius:10px 10px 0 0">
          <p style="margin:0;color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:0.08em">North Down Softball Club</p>
          <p style="margin:4px 0 0;color:#fff;font-size:17px;font-weight:700">${subject.trim()}</p>
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:none">
          <p>Hi ${recipient.name},</p>
          ${body.trim().split("\n").map((line) => `<p style="margin:0 0 10px">${line}</p>`).join("")}
          <p style="margin-top:20px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:16px">
            This message was sent by North Down Softball Council.
          </p>
        </div>
      </div>
    `;
    const text = `Hi ${recipient.name},\n\n${body.trim()}\n\n—\nNorth Down Softball Council`;

    try {
      await sendCouncilEmail({ to: recipient.email, subject: subject.trim(), html, text });
      sentCount++;
    } catch {
      failedCount++;
    }
  }

  await saveAnnouncement({
    subject: subject.trim(),
    body: body.trim(),
    recipients,
    teamId: teamId ?? null,
    teamName,
    sentCount,
    failedCount,
    sentBy: user.id,
  });

  return NextResponse.json({ ok: true, sentCount, failedCount });
}
