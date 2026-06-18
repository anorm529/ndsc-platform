"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { UserCircle2 } from "lucide-react";
import type { PlayerProfile } from "@/lib/auth";

const handOptions = ["", "Right", "Left", "Switch"];

export default function ProfileForm({ profile }: { profile: PlayerProfile }) {
  const [position, setPosition] = useState(profile.position ?? "");
  const [bats, setBats] = useState(profile.bats ?? "");
  const [throws, setThrows] = useState(profile.throws ?? "");
  const [shirtNumber, setShirtNumber] = useState(profile.shirtNumber == null ? "" : String(profile.shirtNumber));
  const [memberSince, setMemberSince] = useState(String(profile.memberSince ?? 2014));
  const [membershipStatus, setMembershipStatus] = useState(profile.membershipStatus);
  const [profileImageUrl, setProfileImageUrl] = useState(profile.profileImageUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function saveProfileFields(imageUrl: string) {
    const response = await fetch("/api/members/account/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        position,
        bats,
        throws,
        shirtNumber,
        memberSince,
        membershipStatus,
        profileImageUrl: imageUrl,
      }),
    });
    return response;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    const response = await saveProfileFields(profileImageUrl);
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Could not update profile.");
      return;
    }
    setMessage("Profile updated.");
    router.refresh();
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("File too large — maximum 2 MB");
      return;
    }

    setAvatarUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const uploadResponse = await fetch("/api/members/account/avatar", {
      method: "POST",
      body: formData,
    });
    const uploadData = await uploadResponse.json().catch(() => ({}));

    if (!uploadResponse.ok) {
      setAvatarUploading(false);
      setAvatarError(uploadData.error || "Upload failed — please try again");
      return;
    }

    const newUrl = uploadData.url as string;
    setProfileImageUrl(newUrl);

    const saveResponse = await saveProfileFields(newUrl);
    setAvatarUploading(false);

    if (saveResponse.ok) {
      setMessage("Photo updated.");
      router.refresh();
    }
  }

  return (
    <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      {/* Avatar uploader — full width */}
      <div className="md:col-span-2">
        <span className="text-sm font-semibold text-slate-300">Profile photo</span>
        <div className="mt-3 flex items-center gap-5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-teal-200/30 bg-teal-300/15">
            {profileImageUrl ? (
              <Image
                src={profileImageUrl}
                alt="Profile photo"
                fill
                className="object-cover"
                unoptimized={!profileImageUrl.includes("vercel-storage.com")}
              />
            ) : (
              <UserCircle2 className="h-full w-full p-3 text-teal-300/60" />
            )}
            {avatarUploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1D2E48]/80">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-300 border-t-transparent" />
              </div>
            ) : null}
          </div>

          <div>
            <label className="cursor-pointer rounded-xl border border-slate-600 bg-slate-700/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
              {avatarUploading ? "Uploading…" : profileImageUrl ? "Change photo" : "Upload photo"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
              />
            </label>
            <div className="mt-1.5 text-xs text-slate-500">JPG, PNG or WEBP · Max 2 MB</div>
            {avatarError ? (
              <div className="mt-1.5 text-xs text-rose-400">{avatarError}</div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Existing profile fields */}
      <label className="block">
        <span className="text-sm font-semibold text-slate-300">Member since</span>
        <input
          type="number"
          min={2014}
          max={2100}
          value={memberSince}
          onChange={(e) => setMemberSince(e.target.value)}
          className="mt-2 w-full rounded-xl border border-[#2B4162] bg-slate-700/50 px-4 py-3 text-white outline-none focus:border-teal-300/60"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-slate-300">Position</span>
        <input
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="LF / LCF"
          className="mt-2 w-full rounded-xl border border-[#2B4162] bg-slate-700/50 px-4 py-3 text-white outline-none focus:border-teal-300/60"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-slate-300">Bats</span>
        <select
          value={bats}
          onChange={(e) => setBats(e.target.value)}
          className="mt-2 w-full rounded-xl border border-[#2B4162] bg-[#1D2E48] px-4 py-3 text-white outline-none focus:border-teal-300/60"
        >
          {handOptions.map((option) => (
            <option key={option} value={option}>
              {option || "Not set"}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-slate-300">Throws</span>
        <select
          value={throws}
          onChange={(e) => setThrows(e.target.value)}
          className="mt-2 w-full rounded-xl border border-[#2B4162] bg-[#1D2E48] px-4 py-3 text-white outline-none focus:border-teal-300/60"
        >
          {handOptions.map((option) => (
            <option key={option} value={option}>
              {option || "Not set"}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-slate-300">Shirt number</span>
        <input
          type="number"
          min={0}
          max={99}
          value={shirtNumber}
          onChange={(e) => setShirtNumber(e.target.value)}
          className="mt-2 w-full rounded-xl border border-[#2B4162] bg-slate-700/50 px-4 py-3 text-white outline-none focus:border-teal-300/60"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-slate-300">Membership status</span>
        <input
          value={membershipStatus}
          onChange={(e) => setMembershipStatus(e.target.value)}
          className="mt-2 w-full rounded-xl border border-[#2B4162] bg-slate-700/50 px-4 py-3 text-white outline-none focus:border-teal-300/60"
        />
      </label>

      <div className="md:col-span-2">
        {error ? (
          <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-xl border border-teal-300/20 bg-teal-500/10 px-4 py-3 text-sm text-teal-400">
            {message}
          </div>
        ) : null}
        <button
          disabled={loading}
          className="mt-4 rounded-xl bg-teal-300 px-5 py-3 text-sm font-semibold text-[#0F172A] disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
