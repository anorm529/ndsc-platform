import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { isAdminAuthenticated } from "@/lib/admin-session";

export default async function MembersAdminLayout({ children }: { children: ReactNode }) {
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    redirect("/admin/login");
  }

  return (
    <AdminShell userName="NDSC Admin" notificationCount={0}>
      {children}
    </AdminShell>
  );
}
