import { redirect } from "next/navigation";
import { clearCouncilSession } from "@/lib/council-session";

export async function GET() {
  await clearCouncilSession();
  redirect("/login");
}
