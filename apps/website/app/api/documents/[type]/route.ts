import { dbQuery } from "@/lib/db";

type DocumentRow = {
  data: Buffer;
  filename: string;
  content_type: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;

  if (!/^[a-z_]+$/.test(type)) {
    return new Response("Not found", { status: 404 });
  }

  let row: DocumentRow | undefined;
  try {
    const result = await dbQuery<DocumentRow>(
      "SELECT data, filename, content_type FROM club_documents WHERE type = $1",
      [type],
    );
    row = result.rows[0];
  } catch {
    return new Response("Service unavailable", { status: 503 });
  }

  if (!row) {
    return new Response("Document not found", { status: 404 });
  }

  const safeFilename = row.filename.replace(/[^\w\s.\-()]/g, "_");

  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.content_type || "application/pdf",
      "Content-Disposition": `inline; filename="${safeFilename}"`,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
