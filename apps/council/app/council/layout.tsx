import type { ReactNode } from "react";
import { CouncilShell } from "@/components/council-shell";
import { requireCouncilUser } from "@/lib/council-session";

export const dynamic = "force-dynamic";

export default async function CouncilLayout({ children }: { children: ReactNode }) {
  const user = await requireCouncilUser();

  return (
    <CouncilShell
      userName={user.displayName}
      councilPermissions={Array.from(user.councilPermissions)}
      isOwner={user.isOwner}
    >
      {children}
    </CouncilShell>
  );
}
