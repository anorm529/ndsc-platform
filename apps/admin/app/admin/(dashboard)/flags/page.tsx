import Link from "next/link";
import { AlertTriangle, Link2Off, UsersRound, UserRoundX } from "lucide-react";
import { SectionCard } from "@/components/admin/section-card";
import { getAdminFlags } from "@/lib/admin-operations";
import { requireAdminPermission } from "@/lib/permissions";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(value);
}

function FlagList({
  children,
  count,
  empty,
}: {
  children: React.ReactNode;
  count: number;
  empty: string;
}) {
  return (
    <div className="mt-5 space-y-2">
      {count > 0 ? children : (
        <p className="rounded-lg border border-[color:var(--border)] p-3 text-sm text-[#8b95a5]">
          {empty}
        </p>
      )}
    </div>
  );
}

export default async function FlagsPage() {
  await requireAdminPermission("flags");
  const flags = await getAdminFlags();

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard title="Unlinked Users" subtitle="Accounts not connected to a player record." icon={Link2Off}>
        <FlagList count={flags.unlinked.length} empty="No unlinked users.">
          {flags.unlinked.map((user) => (
            <Link
              key={user.id}
              href={`/admin/accounts/${user.id}`}
              className="block rounded-lg border border-[color:var(--border)] p-3 hover:border-[color:var(--accent)]"
            >
              <div className="font-semibold text-white">{user.email}</div>
              <div className="mt-1 text-xs text-[#8b95a5]">Created {formatDate(user.created_at)}</div>
            </Link>
          ))}
        </FlagList>
      </SectionCard>

      <SectionCard title="Multiple Users Per Player" subtitle="Player records linked to more than one account." icon={UsersRound}>
        <FlagList count={flags.multiUserPlayers.length} empty="No duplicate player links.">
          {flags.multiUserPlayers.map((player) => (
            <div key={player.player_id} className="rounded-lg border border-[color:var(--border)] p-3">
              <div className="font-semibold text-white">{player.display_name}</div>
              <div className="mt-1 text-xs text-[#8b95a5]">{player.user_count} linked accounts</div>
            </div>
          ))}
        </FlagList>
      </SectionCard>

      <SectionCard title="Missing Profiles" subtitle="Players without profile metadata." icon={UserRoundX}>
        <FlagList count={flags.playersWithoutProfiles.length} empty="Every player has a profile row.">
          {flags.playersWithoutProfiles.map((player) => (
            <div key={player.id} className="rounded-lg border border-[color:var(--border)] p-3">
              <div className="font-semibold text-white">{player.display_name}</div>
              <div className="mt-1 font-mono text-xs text-[#8b95a5]">{player.id}</div>
            </div>
          ))}
        </FlagList>
      </SectionCard>

      <SectionCard title="Stale Pending" subtitle="Pending accounts older than 14 days." icon={AlertTriangle}>
        <FlagList count={flags.stalePending.length} empty="No stale pending accounts.">
          {flags.stalePending.map((user) => (
            <Link
              key={user.id}
              href={`/admin/accounts/${user.id}`}
              className="block rounded-lg border border-[color:var(--border)] p-3 hover:border-[color:var(--accent)]"
            >
              <div className="font-semibold text-white">{user.email}</div>
              <div className="mt-1 text-xs text-[#8b95a5]">Pending since {formatDate(user.created_at)}</div>
            </Link>
          ))}
        </FlagList>
      </SectionCard>
    </div>
  );
}
