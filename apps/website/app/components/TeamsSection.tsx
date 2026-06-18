"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import TeamDrawer from "./TeamDrawer";
import { teams as teamsData } from "@/app/data/teams";
import type { Team } from "@/app/data/teams";

export default function TeamsSection() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Team | null>(null);

  const openTeam = (team: Team) => {
    setSelected(team);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setSelected(null);
  };

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {teamsData.map((t) => (
          <div
            key={t.key}
            className="softball-cursor overflow-hidden rounded-lg bg-white text-[#0B1324] shadow-sm"
          >
            <div className="relative aspect-[16/10] bg-slate-100">
              <Image
                src={t.teamPhoto}
                alt={`${t.name} team photo for North Down Softball Club`}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1324]/75 via-transparent to-transparent" />
              <Image
                src={t.badge}
                alt={`${t.name} badge`}
                width={76}
                height={76}
                className="absolute bottom-4 left-4 h-16 w-16 object-contain drop-shadow-lg"
              />
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">{t.name}</h3>
                  <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {t.tag}
                  </span>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-600">{t.desc}</p>

              <button
                onClick={() => openTeam(t)}
                className="softball-cursor mt-6 inline-flex items-center gap-2 rounded-lg border border-teal-100 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
              >
                View team
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <TeamDrawer open={open} team={selected} onClose={close} />
    </>
  );
}
