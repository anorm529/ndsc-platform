"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import type { TeamRow } from "@/lib/season-queries";

const RECIPIENT_OPTIONS = [
  { value: "all_enrolled", label: "All enrolled players (active season)" },
  { value: "all_captains", label: "All captains" },
  { value: "all_council", label: "All council members" },
  { value: "team", label: "Specific team only" },
];

interface Props {
  teams: TeamRow[];
}

export function AnnouncementForm({ teams }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState("all_enrolled");
  const [teamId, setTeamId] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [result, setResult] = useState<{ sentCount: number; failedCount: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    if (recipients === "team" && !teamId) return;

    if (!confirm(`Send this announcement to "${RECIPIENT_OPTIONS.find((o) => o.value === recipients)?.label}"?`)) return;

    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, recipients, teamId: teamId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setResult({ sentCount: data.sentCount, failedCount: data.failedCount });
      setStatus("done");
      setSubject("");
      setBody("");
      setRecipients("all_enrolled");
      setTeamId("");
    } catch (err) {
      setErrorMsg(String(err));
      setStatus("error");
    }
  }

  if (status === "done" && result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] p-4">
          <CheckCircle className="h-5 w-5 text-[color:var(--success)] shrink-0" />
          <div>
            <p className="text-[0.88rem] font-semibold text-slate-800">Announcement sent</p>
            <p className="text-[0.78rem] text-[color:var(--muted-foreground)]">
              {result.sentCount} delivered
              {result.failedCount > 0 ? `, ${result.failedCount} failed` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="text-[0.82rem] text-[color:var(--accent)] hover:underline"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[0.78rem] font-medium text-slate-600">Recipients</label>
          <select
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
          >
            {RECIPIENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {recipients === "team" && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[0.78rem] font-medium text-slate-600">Team</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
            >
              <option value="">— select team —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-[0.78rem] font-medium text-slate-600">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject…"
            className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)]"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-[0.78rem] font-medium text-slate-600">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="Write your message here…"
            className="w-full resize-y rounded-xl border border-[color:var(--border)] bg-white px-3 py-3 text-[0.85rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)]"
          />
        </div>
      </div>

      {status === "error" && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-[0.8rem] text-red-700">{errorMsg}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleSend}
        disabled={
          status === "sending" ||
          !subject.trim() ||
          !body.trim() ||
          (recipients === "team" && !teamId)
        }
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] py-2.5 text-[0.88rem] font-medium text-white hover:brightness-105 disabled:opacity-40"
      >
        {status === "sending" ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
        ) : (
          <><Send className="h-4 w-4" /> Send announcement</>
        )}
      </button>
    </div>
  );
}
