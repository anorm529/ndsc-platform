import { KeyRound, ShieldCheck } from "lucide-react";
import {
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  getAllUserPermissions,
  type App,
} from "@ndsc/auth";
import { SectionCard } from "@/components/admin/section-card";
import { requireAdminUser } from "@/lib/admin-session";
import { dbQuery } from "@/lib/db";
import { PermissionsForm } from "./permissions-form";

export const dynamic = "force-dynamic";

type UserRow = {
  id: string;
  email: string;
  role: string;
  display_name: string | null;
};

const APPS: App[] = ["admin", "tournament", "fantasy"];

const APP_LABELS: Record<App, string> = {
  admin:      "Admin panel",
  tournament: "Tournament",
  fantasy:    "Fantasy",
};

async function getGrantableUsers(): Promise<UserRow[]> {
  const result = await dbQuery<UserRow>(`
    SELECT DISTINCT u.id, u.email, u.role,
           COALESCE(p.display_name, split_part(u.email, '@', 1)) AS display_name
    FROM users u
    LEFT JOIN players p ON p.id = u.player_id
    WHERE u.role IN ('owner', 'admin')
       OR EXISTS (
         SELECT 1 FROM app_permissions ap WHERE ap.user_id = u.id
       )
    ORDER BY u.role DESC, display_name
  `);
  return result.rows;
}

export default async function PermissionsPage() {
  const adminUser = await requireAdminUser();

  if (adminUser.role !== "owner") {
    return (
      <SectionCard title="Owner Only" subtitle="Permission management is restricted to owners." icon={KeyRound}>
        <p className="mt-6 rounded-lg border border-[color:var(--border)] p-4 text-sm text-[#c5cfdb]">
          Only owners can grant or revoke app permissions. Your account can use the sections you have been granted access to.
        </p>
      </SectionCard>
    );
  }

  const users = await getGrantableUsers();
  const permissionsByUser = await Promise.all(
    users.map(async (u) => ({ userId: u.id, perms: await getAllUserPermissions(u.id) }))
  );
  const permsMap = new Map(permissionsByUser.map(({ userId, perms }) => [userId, perms]));

  const owners = users.filter((u) => u.role === "owner");
  const others = users.filter((u) => u.role !== "owner");

  return (
    <div className="space-y-6">
      {owners.length > 0 && (
        <SectionCard title="Owners" subtitle="Full access to all apps — permissions cannot be restricted." icon={ShieldCheck}>
          <div className="mt-6 grid gap-2">
            {owners.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[color:var(--accent)]" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{u.display_name}</p>
                  <p className="text-xs text-[color:var(--muted-foreground)]">{u.email}</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full border border-[rgba(29,215,207,0.25)] bg-[rgba(29,215,207,0.08)] px-2.5 py-0.5 text-xs font-semibold text-[color:var(--accent)]">
                  Owner
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {others.length === 0 ? (
        <SectionCard title="Permissions" subtitle="Grant specific app permissions to admin users." icon={KeyRound}>
          <p className="mt-6 text-sm text-[color:var(--muted-foreground)]">
            No admin users found. Grant a user the admin role in Account Management first, or they will appear here once they have been granted any permission.
          </p>
        </SectionCard>
      ) : (
        others.map((user) => {
          const userPerms = permsMap.get(user.id) ?? {};
          return (
            <SectionCard
              key={user.id}
              title={user.display_name ?? user.email}
              subtitle={user.email}
              icon={KeyRound}
            >
              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                {APPS.map((app) => {
                  const appPerms = ALL_PERMISSIONS[app];
                  const granted = new Set<string>(userPerms[app] ?? []);
                  return (
                    <div key={app}>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
                        {APP_LABELS[app]}
                      </p>
                      <PermissionsForm
                        userId={user.id}
                        app={app}
                        permissions={appPerms as readonly string[]}
                        labels={PERMISSION_LABELS[app]}
                        granted={granted}
                      />
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          );
        })
      )}
    </div>
  );
}
