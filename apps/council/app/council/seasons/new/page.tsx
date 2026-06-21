import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCouncilUser, requireRosterManagementAccess } from "@/lib/council-session";
import { getAllSeasons, createSeason, type SeasonStatus } from "@/lib/season-queries";

export default async function NewSeasonPage() {
  const user = await requireCouncilUser();
  await requireRosterManagementAccess(user);

  const seasons = await getAllSeasons();
  const existingYears = new Set(seasons.map((s) => s.year));
  const currentYear = new Date().getFullYear();
  const suggestedYear = Array.from({ length: 5 }, (_, i) => currentYear + i).find(
    (y) => !existingYears.has(y)
  ) ?? currentYear + 1;

  const hasActive = seasons.some((s) => s.status === "active");

  async function handleCreate(formData: FormData) {
    "use server";
    const u = await requireCouncilUser();
    await requireRosterManagementAccess(u);

    const year = parseInt(String(formData.get("year") ?? ""), 10);
    const status = String(formData.get("status") ?? "draft") as SeasonStatus;

    if (!year || year < 2000 || year > 2100) return;

    const id = await createSeason(year, status);
    redirect(`/council/seasons/${id}`);
  }

  return (
    <div className="max-w-md space-y-6">
      <Link href="/council/seasons" className="flex items-center gap-2 text-[0.82rem] text-[color:var(--muted-foreground)] hover:text-slate-900">
        <ArrowLeft className="h-3.5 w-3.5" />
        Seasons
      </Link>

      <div className="council-panel rounded-2xl border p-6">
        <h2 className="mb-5 text-[0.95rem] font-semibold text-slate-800">Create new season</h2>

        <form action={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[0.78rem] font-medium text-[color:var(--muted-foreground)]">
              Season year
            </label>
            <input
              name="year"
              type="number"
              defaultValue={suggestedYear}
              min={2000}
              max={2100}
              required
              className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.88rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[0.78rem] font-medium text-[color:var(--muted-foreground)]">
              Initial status
            </label>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[color:var(--border)] p-3 has-[:checked]:border-[color:var(--accent)] has-[:checked]:bg-[rgba(20,184,166,0.04)]">
                <input type="radio" name="status" value="draft" defaultChecked className="mt-0.5 accent-teal-600" />
                <div>
                  <p className="text-[0.85rem] font-medium text-slate-800">Draft</p>
                  <p className="text-[0.73rem] text-[color:var(--muted-foreground)]">
                    Create now, open for enrollment later
                  </p>
                </div>
              </label>
              <label className={[
                "flex cursor-pointer items-start gap-3 rounded-xl border border-[color:var(--border)] p-3",
                hasActive ? "opacity-50 cursor-not-allowed" : "has-[:checked]:border-[color:var(--accent)] has-[:checked]:bg-[rgba(20,184,166,0.04)]",
              ].join(" ")}>
                <input
                  type="radio"
                  name="status"
                  value="active"
                  disabled={hasActive}
                  className="mt-0.5 accent-teal-600"
                />
                <div>
                  <p className="text-[0.85rem] font-medium text-slate-800">Active immediately</p>
                  <p className="text-[0.73rem] text-[color:var(--muted-foreground)]">
                    {hasActive
                      ? "Another season is already active — close it first"
                      : "Open for enrollment right away, sets as the current season"}
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href="/council/seasons"
              className="flex-1 rounded-xl border border-[color:var(--border)] py-2.5 text-center text-[0.85rem] text-[color:var(--muted-foreground)] hover:text-slate-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] py-2.5 text-[0.85rem] font-medium text-white hover:brightness-105"
            >
              Create season
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
