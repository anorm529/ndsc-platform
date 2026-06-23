import type { ReactNode } from "react";
import { CouncilShell } from "@/components/council-shell";
import { requireCouncilUser } from "@/lib/council-session";
import { getFlagCount } from "@/lib/account-queries";

export const dynamic = "force-dynamic";

export default async function CouncilLayout({ children }: { children: ReactNode }) {
  const user = await requireCouncilUser();
  const flagCount = await getFlagCount();

  return (
    <CouncilShell
      userName={user.displayName}
      councilPermissions={Array.from(user.councilPermissions)}
      isOwner={user.isOwner}
      flagCount={flagCount}
    >
      {children}
    </CouncilShell>
  );
}
