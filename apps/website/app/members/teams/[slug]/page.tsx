import { notFound } from "next/navigation";
import TeamHubContent from "@/app/members/components/TeamHubContent";
import { requireCurrentUser } from "@/lib/auth";
import { CLUB_TEAM_SLUGS, getTeamPageData } from "@/lib/ndsc-data";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ season?: string }>;
}) {
  const user = await requireCurrentUser();
  const { slug: rawSlug } = await params;
  const sp = (await searchParams) ?? {};
  const slug = rawSlug?.toLowerCase().trim();

  if (!CLUB_TEAM_SLUGS.includes(slug as (typeof CLUB_TEAM_SLUGS)[number])) {
    return notFound();
  }

  const teamData = await getTeamPageData(slug, sp.season);
  if (!teamData) return notFound();

  return <TeamHubContent teamData={teamData} user={user} />;
}
