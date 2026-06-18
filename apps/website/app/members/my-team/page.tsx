import { notFound } from "next/navigation";
import TeamHubContent from "@/app/members/components/TeamHubContent";
import { buildMemberProfile } from "@/app/members/lib/memberProfile";
import { requireCurrentUser } from "@/lib/auth";
import { getClubData, getTeamPageData } from "@/lib/ndsc-data";

export const dynamic = "force-dynamic";

export default async function MyTeamPage({
  searchParams,
}: {
  searchParams?: Promise<{ season?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const user = await requireCurrentUser();
  const clubData = await getClubData();
  const profile = buildMemberProfile(user, clubData);

  if (!profile.activeTeamSlug) return notFound();

  const teamData = await getTeamPageData(profile.activeTeamSlug, sp.season);
  if (!teamData) return notFound();

  return <TeamHubContent teamData={teamData} user={user} />;
}
