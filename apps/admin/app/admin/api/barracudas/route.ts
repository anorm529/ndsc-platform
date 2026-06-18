import { isAdminAuthenticated } from "@/lib/admin-session";
import { getBarracudasPlayers } from "@/lib/barracudas";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const players = await getBarracudasPlayers();
    return Response.json({ players });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to load Barracudas players.",
      },
      { status: 500 },
    );
  }
}
