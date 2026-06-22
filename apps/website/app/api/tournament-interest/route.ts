import { NextRequest, NextResponse } from "next/server";
import { councilQuery } from "@/lib/council-db";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? process.env.PASSWORD_RESET_FROM_EMAIL;
const NOTIFY_EMAIL = "northdownsoftballclub@gmail.com";

type PlayerBody = {
  type: "player";
  name: string;
  email: string;
  phone?: string;
  experience: "never" | "beginner" | "some" | "experienced";
  notes?: string;
};

type TeamBody = {
  type: "team";
  name: string;
  email: string;
  phone?: string;
  team_name: string;
  team_size: number;
  notes?: string;
};

type Body = PlayerBody | TeamBody;

function validateBody(raw: unknown): Body | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;

  if (!["player", "team"].includes(b.type as string)) return null;
  if (!b.name || typeof b.name !== "string" || b.name.trim().length < 2) return null;
  if (!b.email || typeof b.email !== "string" || !b.email.includes("@")) return null;

  if (b.type === "player") {
    if (!["never", "beginner", "some", "experienced"].includes(b.experience as string)) return null;
  }

  if (b.type === "team") {
    if (!b.team_name || typeof b.team_name !== "string" || b.team_name.trim().length < 2) return null;
    const size = Number(b.team_size);
    if (!Number.isInteger(size) || size < 1 || size > 50) return null;
  }

  return b as unknown as Body;
}

const experienceLabels: Record<string, string> = {
  never: "Never played before",
  beginner: "Beginner",
  some: "Some experience",
  experienced: "Experienced",
};

async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (!RESEND_API_KEY || !FROM_EMAIL) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html, text }),
  });
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = validateBody(raw);
  if (!body) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 422 });
  }

  try {
    if (body.type === "player") {
      await councilQuery(
        `INSERT INTO tournament_interest (type, name, email, phone, experience, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ["player", body.name.trim(), body.email.trim().toLowerCase(), body.phone?.trim() ?? null, body.experience, body.notes?.trim() ?? null]
      );
    } else {
      await councilQuery(
        `INSERT INTO tournament_interest (type, name, email, phone, team_name, team_size, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ["team", body.name.trim(), body.email.trim().toLowerCase(), body.phone?.trim() ?? null, body.team_name.trim(), body.team_size, body.notes?.trim() ?? null]
      );
    }
  } catch (err) {
    console.error("tournament-interest DB error:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  // Confirmation to registrant
  if (body.type === "player") {
    await sendEmail(
      body.email,
      "NDSC Women's Tournament 2027 — We've got your interest!",
      `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2B2254;max-width:560px">
        <div style="background:#2B2254;padding:24px 28px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;color:#ff79ca;font-size:18px;text-transform:uppercase;letter-spacing:0.1em">North Down Softball Club</h1>
          <p style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:900;font-style:italic;text-transform:uppercase">Women's Tournament 2027</p>
        </div>
        <div style="background:#f9f6ff;padding:28px;border-radius:0 0 12px 12px;border:2px solid #2B2254">
          <p>Hi ${body.name.trim()},</p>
          <p>Thanks for registering your interest in the 2027 NDSC Women's Tournament! We'll be in touch as dates, format, and team options take shape.</p>
          <p><strong>Your details:</strong><br/>
            Name: ${body.name.trim()}<br/>
            Email: ${body.email}<br/>
            Experience: ${experienceLabels[body.experience] ?? body.experience}${body.phone ? `<br/>Phone: ${body.phone}` : ""}${body.notes ? `<br/>Notes: ${body.notes}` : ""}
          </p>
          <p style="color:#7c6fa0;font-size:14px">If you have any questions in the meantime, email us at <a href="mailto:northdownsoftballclub@gmail.com" style="color:#E84AA5">northdownsoftballclub@gmail.com</a>.</p>
        </div>
      </div>`,
      `Hi ${body.name.trim()},\n\nThanks for registering your interest in the 2027 NDSC Women's Tournament! We'll be in touch as plans take shape.\n\nYour details:\nName: ${body.name.trim()}\nEmail: ${body.email}\nExperience: ${experienceLabels[body.experience] ?? body.experience}${body.phone ? `\nPhone: ${body.phone}` : ""}${body.notes ? `\nNotes: ${body.notes}` : ""}\n\nQuestions? Email northdownsoftballclub@gmail.com`
    );
  } else {
    await sendEmail(
      body.email,
      "NDSC Women's Tournament 2027 — Team interest received",
      `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2B2254;max-width:560px">
        <div style="background:#2B2254;padding:24px 28px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;color:#ff79ca;font-size:18px;text-transform:uppercase;letter-spacing:0.1em">North Down Softball Club</h1>
          <p style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:900;font-style:italic;text-transform:uppercase">Women's Tournament 2027</p>
        </div>
        <div style="background:#f9f6ff;padding:28px;border-radius:0 0 12px 12px;border:2px solid #2B2254">
          <p>Hi ${body.name.trim()},</p>
          <p>Thanks for registering <strong>${body.team_name.trim()}</strong> for the 2027 NDSC Women's Tournament! We'll be in touch once planning is underway.</p>
          <p><strong>Your details:</strong><br/>
            Contact: ${body.name.trim()}<br/>
            Email: ${body.email}<br/>
            Team: ${body.team_name.trim()}<br/>
            Players: ~${body.team_size}${body.phone ? `<br/>Phone: ${body.phone}` : ""}${body.notes ? `<br/>Notes: ${body.notes}` : ""}
          </p>
          <p style="color:#7c6fa0;font-size:14px">Questions? Email <a href="mailto:northdownsoftballclub@gmail.com" style="color:#E84AA5">northdownsoftballclub@gmail.com</a>.</p>
        </div>
      </div>`,
      `Hi ${body.name.trim()},\n\nThanks for registering ${body.team_name.trim()} for the 2027 NDSC Women's Tournament!\n\nYour details:\nContact: ${body.name.trim()}\nEmail: ${body.email}\nTeam: ${body.team_name.trim()}\nPlayers: ~${body.team_size}${body.phone ? `\nPhone: ${body.phone}` : ""}${body.notes ? `\nNotes: ${body.notes}` : ""}\n\nQuestions? Email northdownsoftballclub@gmail.com`
    );
  }

  // Notification to club
  const label = body.type === "player"
    ? `Player: ${body.name.trim()} (${body.email}) — ${experienceLabels[body.experience] ?? body.experience}`
    : `Team: ${body.team_name.trim()} — Contact: ${body.name.trim()} (${body.email}), ~${body.team_size} players`;

  await sendEmail(
    NOTIFY_EMAIL,
    `New 2027 tournament interest — ${body.type === "player" ? "Player" : "Team"}`,
    `<div style="font-family:Arial,sans-serif;color:#2B2254"><p>New tournament interest submission:</p><p>${label}</p>${body.notes ? `<p>Notes: ${body.notes}</p>` : ""}<p><a href="https://council.northdownsoftballclub.co.uk/council/signups">View in Council Dashboard →</a></p></div>`,
    `New tournament interest submission:\n${label}${body.notes ? `\nNotes: ${body.notes}` : ""}\n\nView in Council: https://council.northdownsoftballclub.co.uk/council/signups`
  );

  return NextResponse.json({ ok: true });
}
