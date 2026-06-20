"use client";

import { useState } from "react";
import { Mail, Phone, Send, X, Loader2, CheckCircle2, ChevronDown, Trash2 } from "lucide-react";

type Signup = {
  id: string;
  type: "player" | "team";
  name: string;
  email: string;
  phone: string | null;
  experience: string | null;
  team_name: string | null;
  team_size: number | null;
  notes: string | null;
  status: "new" | "contacted" | "confirmed" | "withdrawn";
  created_at: string;
};

const experienceLabels: Record<string, string> = {
  never:       "Never played",
  beginner:    "Beginner",
  some:        "Some experience",
  experienced: "Experienced",
};

const statusStyles: Record<string, string> = {
  new:       "bg-amber-50 text-amber-700 border border-amber-200",
  contacted: "bg-blue-50 text-blue-700 border border-blue-200",
  confirmed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  withdrawn: "bg-slate-100 text-slate-500 border border-slate-200",
};

export function SignupCard({ signup }: { signup: Signup }) {
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState(`NDSC Women's Tournament 2027`);
  const [message, setMessage] = useState("");
  const [sendState, setSendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [currentStatus, setCurrentStatus] = useState(signup.status);
  const [deleteState, setDeleteState] = useState<"idle" | "confirm" | "deleting">("idle");
  const [deleted, setDeleted] = useState(false);

  const recipientName =
    signup.type === "team" ? signup.team_name ?? signup.name : signup.name;

  async function handleDelete() {
    setDeleteState("deleting");
    try {
      const res = await fetch(`/api/signups/${signup.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeleted(true);
    } catch {
      setDeleteState("idle");
    }
  }

  async function send() {
    if (!message.trim()) return;
    setSendState("sending");
    try {
      const res = await fetch("/api/signups/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupId: signup.id, subject, message }),
      });
      if (!res.ok) throw new Error();
      setSendState("sent");
      if (currentStatus === "new") setCurrentStatus("contacted");
      setTimeout(() => {
        setComposing(false);
        setSendState("idle");
        setMessage("");
      }, 2000);
    } catch {
      setSendState("error");
    }
  }

  if (deleted) return null;

  return (
    <div className="px-5 py-5">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.95rem] font-semibold text-slate-800">
            {signup.type === "team" ? signup.team_name : signup.name}
          </p>
          {signup.type === "team" && (
            <p className="mt-0.5 text-[0.78rem] text-slate-500">
              Contact: {signup.name}{signup.team_size ? ` · ~${signup.team_size} players` : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold capitalize ${statusStyles[currentStatus]}`}>
            {currentStatus}
          </span>
          <span className="text-[0.68rem] text-[color:var(--muted-foreground)]">
            {new Date(signup.created_at).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Contact details */}
      <div className="mt-3 flex flex-col gap-1.5">
        <a
          href={`mailto:${signup.email}`}
          className="flex items-center gap-2 text-[0.8rem] text-[color:var(--muted-foreground)] hover:text-[color:var(--accent)]"
        >
          <Mail className="h-3.5 w-3.5 shrink-0" />
          {signup.email}
        </a>
        {signup.phone && (
          <span className="flex items-center gap-2 text-[0.8rem] text-[color:var(--muted-foreground)]">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {signup.phone}
          </span>
        )}
        {signup.experience && (
          <span className="text-[0.78rem] italic text-[color:var(--muted-foreground)]">
            {experienceLabels[signup.experience] ?? signup.experience}
          </span>
        )}
        {signup.notes && (
          <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-[0.78rem] text-slate-600">
            {signup.notes}
          </p>
        )}
      </div>

      {/* Action row */}
      <div className="mt-4 flex items-center gap-2">
        {!composing && (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-[0.78rem] font-medium text-[color:var(--muted-foreground)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
          >
            <Mail className="h-3.5 w-3.5" />
            Email {recipientName.split(" ")[0]}
            <ChevronDown className="h-3 w-3" />
          </button>
        )}

        {!composing && deleteState === "idle" && (
          <button
            type="button"
            onClick={() => setDeleteState("confirm")}
            className="flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-[0.78rem] font-medium text-[color:var(--muted-foreground)] transition hover:border-red-300 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}

        {!composing && deleteState === "confirm" && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
            <span className="text-[0.78rem] font-medium text-red-700">Delete all data for this signup?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteState === "deleting"}
              className="rounded-md bg-red-600 px-2.5 py-1 text-[0.72rem] font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {deleteState === "deleting" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => setDeleteState("idle")}
              className="text-[0.72rem] font-medium text-red-500 hover:text-red-700"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Email compose panel */}
      <div className="mt-2">
        {composing && (
          <div className="rounded-xl border border-[color:var(--border)] bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">
                To: {signup.email}
              </p>
              <button
                type="button"
                onClick={() => { setComposing(false); setSendState("idle"); }}
                className="rounded p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              className="mb-2 w-full rounded-lg border border-[color:var(--border)] bg-white px-3 py-2 text-[0.82rem] text-slate-700 outline-none focus:border-[color:var(--accent)]"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />

            <textarea
              className="w-full resize-none rounded-lg border border-[color:var(--border)] bg-white px-3 py-2 text-[0.82rem] text-slate-700 outline-none focus:border-[color:var(--accent)]"
              rows={5}
              placeholder={`Hi ${recipientName.split(" ")[0]},\n\n`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <p className="mt-1.5 text-[0.68rem] text-slate-400">
              Sent from the club address · replies go to your email
            </p>

            {sendState === "error" && (
              <p className="mt-2 text-[0.75rem] font-semibold text-red-600">
                Failed to send — check Resend is configured and try again.
              </p>
            )}

            <div className="mt-3 flex justify-end">
              {sendState === "sent" ? (
                <span className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Sent!
                </span>
              ) : (
                <button
                  type="button"
                  onClick={send}
                  disabled={sendState === "sending" || !message.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--accent)] px-4 py-2 text-[0.8rem] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {sendState === "sending"
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                    : <><Send className="h-3.5 w-3.5" /> Send Email</>
                  }
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

