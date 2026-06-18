import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminUser } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const adminUser = await requireAdminUser();

  return (
    <AdminShell userName={adminUser.email} notificationCount={0}>
      {children}
    </AdminShell>
  );
}
