import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser } from "@/lib/council-session";
import { mainQuery } from "@/lib/main-db";

const ELEVATED = new Set(["chairman", "vice_chair"]);
const ALLOWED_TYPES = new Set(["constitution", "bylaws"]);
const LABELS: Record<string, string> = {
  constitution: "Club Constitution",
  bylaws: "Club Bylaws",
};

function isElevated(user: NonNullable<Awaited<ReturnType<typeof getCouncilUser>>>) {
  return user.isOwner || [...user.councilPermissions].some((p) => ELEVATED.has(p));
}

// Ensure table exists (safe to call every time)
async function ensureTable() {
  await mainQuery(`
    CREATE TABLE IF NOT EXISTS club_documents (
      id               SERIAL PRIMARY KEY,
      type             VARCHAR(50)  NOT NULL UNIQUE,
      label            VARCHAR(255) NOT NULL,
      filename         VARCHAR(255) NOT NULL,
      content_type     VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
      data             BYTEA        NOT NULL,
      file_size_bytes  INTEGER,
      uploaded_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      uploaded_by      TEXT
    )
  `);
}

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !isElevated(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const type = String(formData.get("type") ?? "");
  const file = formData.get("file") as File | null;

  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }

  await ensureTable();
  const buffer = Buffer.from(await file.arrayBuffer());

  await mainQuery(
    `INSERT INTO club_documents (type, label, filename, content_type, data, file_size_bytes, uploaded_by)
     VALUES ($1, $2, $3, 'application/pdf', $4, $5, $6)
     ON CONFLICT (type) DO UPDATE SET
       label           = EXCLUDED.label,
       filename        = EXCLUDED.filename,
       content_type    = EXCLUDED.content_type,
       data            = EXCLUDED.data,
       file_size_bytes = EXCLUDED.file_size_bytes,
       uploaded_by     = EXCLUDED.uploaded_by,
       uploaded_at     = NOW()`,
    [type, LABELS[type], file.name, buffer, file.size, user.email]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !isElevated(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { type } = await req.json() as { type?: string };
  if (!type || !ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }

  await mainQuery(`DELETE FROM club_documents WHERE type = $1`, [type]);
  return NextResponse.json({ ok: true });
}
