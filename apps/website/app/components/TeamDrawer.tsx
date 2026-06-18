"use client";

import Image from "next/image";
import { useEffect } from "react";
import { Shield, Trophy, UserRound, X } from "lucide-react";
import type { Team } from "@/app/data/teams";

export default function TeamDrawer({
  open,
  team,
  onClose,
}: {
  open: boolean;
  team: Team | null;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <button
        aria-label="Close team details"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full transform bg-white shadow-2xl transition-transform duration-300 md:w-[520px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#0B1324] shadow-sm transition hover:bg-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {team && (
          <div className="h-full overflow-y-auto bg-white">
            <div className="relative aspect-[16/11] bg-slate-100">
              <Image
                src={team.teamPhoto}
                alt={`${team.name} team photo for North Down Softball Club at Ward Park Bangor`}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1324]/80 via-[#0B1324]/20 to-transparent" />
              <div className="absolute bottom-6 left-6 flex items-end gap-4 text-white">
                <Image
                  src={team.badge}
                  alt={`${team.name} logo for North Down Softball Club`}
                  width={96}
                  height={96}
                  className="h-20 w-20 object-contain drop-shadow-lg"
                />
                <div>
                  <div className="text-sm font-semibold text-teal-200">{team.tag}</div>
                  <h2 className="text-3xl font-bold">NDSC {team.name}</h2>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid gap-3">
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 text-[#0B1324]">
                  <UserRound className="h-5 w-5 text-teal-700" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Captain
                    </div>
                    <div className="font-semibold">{team.captain}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 text-[#0B1324]">
                  <Shield className="h-5 w-5 text-teal-700" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Division
                    </div>
                    <div className="font-semibold">{team.division}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 text-[#0B1324]">
                  <Trophy className="h-5 w-5 text-teal-700" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Previous season
                    </div>
                    <div className="font-semibold">{team.lastSeason}</div>
                  </div>
                </div>
              </div>

              <p className="mt-8 text-sm leading-7 text-slate-700">
                {team.about}
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
