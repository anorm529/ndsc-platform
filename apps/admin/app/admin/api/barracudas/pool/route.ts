import { hasAdminPermission } from "@/lib/permissions";
import { getGuestPlayerPool } from "@/lib/barracudas";

export async function GET() {
  if (!(await hasAdminPermission("barracudas"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const players = await getGuestPlayerPool();
    return Response.json({ players });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to load the player database.",
      },
      { status: 500 },
    );
  }
}
