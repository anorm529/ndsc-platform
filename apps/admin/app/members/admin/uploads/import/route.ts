import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { importCsvToNeon, UploadValidationError } from "@/lib/neon-admin";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await importCsvToNeon(await request.formData());
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          errors: error.errors,
          preview: error.preview,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to import upload." },
      { status: 400 },
    );
  }
}
