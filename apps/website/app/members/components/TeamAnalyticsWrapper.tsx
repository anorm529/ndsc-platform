"use client";

import dynamic from "next/dynamic";

const TeamAnalytics = dynamic(
  () => import("@/app/members/components/TeamAnalytics"),
  {
    ssr: false,
    loading: () => (
      <div className="mt-8 rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6 text-sm text-slate-400">
        Loading analytics…
      </div>
    ),
  }
);

export default TeamAnalytics;