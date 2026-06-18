import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { importCsvToNeon } from "@/lib/neon-admin";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await importCsvToNeon(await request.formData());
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to import upload." },
      { status: 400 },
    );
  }
}
