import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { getUploadTemplates } from "@/lib/neon-admin";

function buildPdfBuffer(document: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const templates = await getUploadTemplates();
  const document = new PDFDocument({ margin: 42, size: "A4" });
  const pdfPromise = buildPdfBuffer(document);

  document.fontSize(22).text("NDSC Neon Upload Headers", { underline: false });
  document.moveDown(0.4);
  document
    .fontSize(10)
    .fillColor("#555")
    .text("Generated from the connected Neon database schema. Use the CSV templates for Excel uploads.");
  document.moveDown(1);

  for (const template of templates) {
    document.fillColor("#111").fontSize(15).text(template.label);
    document.fillColor("#555").fontSize(9).text(`Target table: ${template.targetTable}`);
    document.moveDown(0.35);

    if (template.headers.length === 0) {
      document.fillColor("#a33").fontSize(10).text("Table missing or no uploadable columns found.");
      document.moveDown(0.8);
      continue;
    }

    document.fillColor("#111").fontSize(10).text("Required headers:");
    document
      .fillColor("#333")
      .fontSize(9)
      .text(template.requiredHeaders.length > 0 ? template.requiredHeaders.join(", ") : "None");
    document.moveDown(0.25);
    document.fillColor("#111").fontSize(10).text("All upload headers:");
    document.fillColor("#333").fontSize(9).text(template.headers.join(", "), {
      width: 500,
    });
    if (template.notes?.length) {
      document.moveDown(0.25);
      document.fillColor("#555").fontSize(9).text(template.notes.join("\n"), {
        width: 500,
      });
    }
    document.moveDown(0.9);
  }

  document.end();
  const pdf = await pdfPromise;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="ndsc-neon-upload-headers.pdf"',
    },
  });
}
