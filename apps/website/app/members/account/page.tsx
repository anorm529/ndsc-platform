import MembersNav from "@/app/members/components/MembersNav";
import ChangePasswordForm from "@/app/members/account/change-password-form";
import LogoutOtherSessionsButton from "@/app/members/account/logout-other-sessions-button";
import ProfileForm from "@/app/members/account/profile-form";
import { getPlayerProfile, listUserSessions, requireCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AccountPage() {
  const user = await requireCurrentUser();
  const [sessions, profile] = await Promise.all([
    listUserSessions(user.id),
    getPlayerProfile(user.playerId),
  ]);

  return (
    <main className="min-h-screen bg-[#0F172A] text-white">
      <MembersNav user={user} />
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 md:px-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
          <h1 className="text-3xl font-semibold">Account</h1>
          <div className="mt-6 space-y-3 text-sm">
            {[
              ["Email", user.email],
              ["Role", user.role],
              ["Status", user.accountStatus],
              ["Linked Player", user.playerName],
              ["Position", profile.position ?? "Not set"],
              ["Bats", profile.bats ?? "Not set"],
              ["Throws", profile.throws ?? "Not set"],
              ["Shirt Number", profile.shirtNumber == null ? "Not set" : String(profile.shirtNumber)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 rounded-xl bg-slate-700/40 px-4 py-3">
                <span className="text-slate-400">{label}</span>
                <span className="font-semibold capitalize">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold">Player Profile</h2>
          <p className="mt-1 text-sm text-slate-400">
            These fields feed your member dashboard and can be adjusted independently of stats.
          </p>
          <ProfileForm profile={profile} />
        </div>

        <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
          <h2 className="text-xl font-semibold">Change Password</h2>
          <ChangePasswordForm />
        </div>

        <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Active Sessions</h2>
              <p className="mt-1 text-sm text-slate-400">Review devices currently signed in to this account.</p>
            </div>
            <LogoutOtherSessionsButton />
          </div>

          <div className="mt-5 grid gap-3">
            {sessions.map((session) => (
              <div key={session.id} className="rounded-xl border border-[#2B4162] bg-slate-700/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      {session.current ? "Current session" : "Signed-in device"}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      {session.deviceName ?? "Unknown device"}
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-400">
                    <div>Last seen {formatDate(session.lastSeen)}</div>
                    <div>Expires {formatDate(session.expiresAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
