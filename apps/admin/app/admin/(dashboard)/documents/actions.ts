"use server";

import { revalidatePath } from "next/cache";
import { dbQuery } from "@/lib/db";
import { assertAdminPermission } from "@/lib/permissions";
import { requireAdminUser } from "@/lib/admin-session";

const ALLOWED_TYPES = ["constitution", "bylaws"] as const;
type DocumentType = (typeof ALLOWED_TYPES)[number];

const LABELS: Record<DocumentType, string> = {
  constitution: "Club Constitution",
  bylaws: "Club Bylaws",
};

function isAllowedType(type: string): type is DocumentType {
  return (ALLOWED_TYPES as readonly string[]).includes(type);
}

export async function ensureDocumentsTable() {
  await dbQuery(`
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

export async function uploadDocumentAction(formData: FormData) {
  await assertAdminPermission("documents");
  const adminUser = await requireAdminUser();

  const type = formData.get("type") as string;
  const file = formData.get("file") as File | null;

  if (!isAllowedType(type)) throw new Error("Invalid document type.");
  if (!file || file.size === 0) throw new Error("Please select a PDF file.");
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    throw new Error("Only PDF files are accepted.");
  }

  await ensureDocumentsTable();

  const buffer = Buffer.from(await file.arrayBuffer());
  const label = LABELS[type];

  await dbQuery(
    `INSERT INTO club_documents (type, label, filename, content_type, data, file_size_bytes, uploaded_by, uploaded_at)
     VALUES ($1, $2, $3, 'application/pdf', $4, $5, $6, NOW())
     ON CONFLICT (type) DO UPDATE SET
       label           = EXCLUDED.label,
       filename        = EXCLUDED.filename,
       content_type    = EXCLUDED.content_type,
       data            = EXCLUDED.data,
       file_size_bytes = EXCLUDED.file_size_bytes,
       uploaded_by     = EXCLUDED.uploaded_by,
       uploaded_at     = NOW()`,
    [type, label, file.name, buffer, file.size, adminUser.email],
  );

  revalidatePath("/admin/documents");
}

export async function deleteDocumentAction(formData: FormData) {
  await assertAdminPermission("documents");

  const type = formData.get("type") as string;
  if (!isAllowedType(type)) throw new Error("Invalid document type.");

  await dbQuery("DELETE FROM club_documents WHERE type = $1", [type]);
  revalidatePath("/admin/documents");
}
