import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminUser } from "@/lib/admin-session";
import { getAdminUserPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const adminUser = await requireAdminUser();
  const isOwner = adminUser.role === "owner";
  const grantedPermissions = isOwner
    ? []
    : Array.from(await getAdminUserPermissions(adminUser.id));

  return (
    <AdminShell
      userName={adminUser.email}
      notificationCount={0}
      isOwner={isOwner}
      grantedPermissions={grantedPermissions}
    >
      {children}
    </AdminShell>
  );
}
