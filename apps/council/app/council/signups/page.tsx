import { ClipboardList, Users, UserPlus, Mail } from "lucide-react";
import { requireCouncilUser } from "@/lib/council-session";
import { councilQuery } from "@/db/council-db";
import { SignupCard } from "./signup-card";

type Signup = {
  id: string;
  type: "player" | "team";
  name: string;
  email: string;
  phone: string | null;
  experience: string | null;
  team_name: string | null;
  team_size: number | null;
  notes: string | null;
  status: "new" | "contacted" | "confirmed" | "withdrawn";
  created_at: string;
};

export default async function SignupsPage() {
  await requireCouncilUser();

  const { rows: signups } = await councilQuery<Signup>(
    `SELECT * FROM tournament_interest ORDER BY created_at DESC`
  );

  const players = signups.filter((s) => s.type === "player");
  const teams   = signups.filter((s) => s.type === "team");

  return (
    <div className="max-w-4xl space-y-8">

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total signups", value: signups.length,                                    icon: ClipboardList },
          { label: "Players",       value: players.length,                                    icon: UserPlus },
          { label: "Teams",         value: teams.length,                                      icon: Users },
          { label: "New",           value: signups.filter((s) => s.status === "new").length,  icon: Mail },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="council-panel rounded-2xl border p-4">
            <Icon className="mb-2 h-4 w-4 text-[color:var(--accent)]" />
            <div className="text-2xl font-semibold text-slate-800">{value}</div>
            <div className="text-[0.73rem] text-[color:var(--muted-foreground)]">{label}</div>
          </div>
        ))}
      </div>

      {/* Player signups */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[0.92rem] font-semibold text-slate-800">
          <UserPlus className="h-4 w-4 text-[color:var(--accent)]" />
          Individual Players
          <span className="ml-1 rounded-full bg-[rgba(20,184,166,0.1)] px-2 py-0.5 text-[0.7rem] text-[color:var(--accent)]">
            {players.length}
          </span>
        </h2>

        {players.length === 0 ? (
          <div className="council-panel rounded-2xl border p-6 text-center text-[0.88rem] text-[color:var(--muted-foreground)]">
            No individual player signups yet.
          </div>
        ) : (
          <div className="council-panel rounded-2xl border divide-y divide-[color:var(--border)]">
            {players.map((s) => <SignupCard key={s.id} signup={s} />)}
          </div>
        )}
      </section>

      {/* Team signups */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[0.92rem] font-semibold text-slate-800">
          <Users className="h-4 w-4 text-[color:var(--accent)]" />
          Teams
          <span className="ml-1 rounded-full bg-[rgba(20,184,166,0.1)] px-2 py-0.5 text-[0.7rem] text-[color:var(--accent)]">
            {teams.length}
          </span>
        </h2>

        {teams.length === 0 ? (
          <div className="council-panel rounded-2xl border p-6 text-center text-[0.88rem] text-[color:var(--muted-foreground)]">
            No team signups yet.
          </div>
        ) : (
          <div className="council-panel rounded-2xl border divide-y divide-[color:var(--border)]">
            {teams.map((s) => <SignupCard key={s.id} signup={s} />)}
          </div>
        )}
      </section>
    </div>
  );
}
