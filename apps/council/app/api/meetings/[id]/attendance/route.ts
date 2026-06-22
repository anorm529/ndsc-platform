import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasSecretaryAccess } from "@/lib/council-session";
import { upsertAttendance, type AttendanceStatus } from "@/lib/council-queries";

const VALID_STATUSES = new Set(["present", "absent", "apologies"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const user = await getCouncilUser();
  if (!user || !hasSecretaryAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, status } = await req.json() as {
    userId?: string;
    status?: string | null;
  };

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  if (status !== null && status !== undefined && !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await upsertAttendance(meetingId, userId, (status as AttendanceStatus) ?? null);
  return NextResponse.json({ ok: true });
}
