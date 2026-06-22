"use client";

import { useState, useRef } from "react";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  type: string;
  label: string;
  hasExisting: boolean;
}

export function DocumentActions({ type, label, hasExisting }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("type", type);
    formData.set("file", file);

    const res = await fetch("/api/documents", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(data.error ?? "Upload failed");
    } else {
      router.refresh();
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleDelete() {
    if (!confirm(`Delete the ${label}? This will remove it from the public website.`)) return;
    setDeleting(true);
    setError(null);

    const res = await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data = await res.json();
    setDeleting(false);

    if (!res.ok) {
      setError(data.error ?? "Delete failed");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[rgba(20,184,166,0.1)] px-3 py-1.5 text-[0.78rem] font-medium text-[color:var(--accent)] hover:bg-[rgba(20,184,166,0.18)]">
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {hasExisting ? "Replace" : "Upload PDF"}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>

      {hasExisting && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 rounded-lg bg-[rgba(239,68,68,0.08)] px-3 py-1.5 text-[0.78rem] font-medium text-[color:var(--danger)] hover:bg-[rgba(239,68,68,0.15)] disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete
        </button>
      )}

      {error && (
        <span className="text-[0.72rem] text-[color:var(--danger)]">{error}</span>
      )}
    </div>
  );
}
