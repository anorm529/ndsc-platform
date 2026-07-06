import { NextResponse } from "next/server";
import { hasAdminPermission } from "@/lib/permissions";
import { buildUploadPreview } from "@/lib/neon-admin";

export async function POST(request: Request) {
  if (!(await hasAdminPermission("database"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const preview = await buildUploadPreview(await request.formData());
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to preview upload." },
      { status: 400 },
    );
  }
}
