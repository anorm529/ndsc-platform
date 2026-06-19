import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  AtSign,
  ClipboardPen,
  History,
  KeyRound,
  Link2Off,
  LinkIcon,
  Monitor,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRoundCog,
} from "lucide-react";
import { FormSubmitButton } from "@/components/admin/form-submit-button";
import { SectionCard } from "@/components/admin/section-card";
import { getAccountDetail } from "@/lib/admin-accounts";
import { requireAdminUser } from "@/lib/admin-session";
import { requireAdminPermission } from "@/lib/permissions";
import {
  approveUserAction,
  addAdminNoteAction,
  changeRoleAction,
  createAndLinkPlayerAction,
  deleteUserAction,
  disableUserAction,
  relinkUserAction,
  resetPasswordAction,
  revokeAllSessionsAction,
  revokeSessionAction,
  searchPlayersForAccountAction,
  updateEmailAction,
  updatePlayerProfileAction,
} from "../actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "Never";
}

function fieldClassName() {
  return "admin-panel-soft h-11 rounded-lg px-3 text-sm text-white outline-none";
}

function inputClassName() {
  return "admin-panel-soft h-11 w-full rounded-lg px-3 text-sm text-white outline-none placeholder:text-[#7f8a9a]";
}

function formatAuditValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Empty";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export default async function AccountDetailPage({ params, searchParams }: PageProps) {
  await requireAdminPermission("accounts");
  const [{ id }, resolvedSearchParams, adminUser] = await Promise.all([
    params,
    searchParams,
    requireAdminUser(),
  ]);
  const playerSearch = firstParam(resolvedSearchParams?.playerSearch) || "";
  const account = await getAccountDetail(id, playerSearch);

  if (!account) {
    notFound();
  }

  const isOwnerTarget = account.role === "owner";
  const canMutate = adminUser.role === "owner" || !isOwnerTarget;
  const canAssignOwner = adminUser.role === "owner";
  const canSetTemporaryPassword = adminUser.role === "owner" && canMutate;
  const matchLabel = playerSearch ? "Search results" : "Suggested matches";
  const protectedOwnerMessage = (
    <p className="mt-6 rounded-lg border border-[color:var(--border)] p-4 text-sm text-[#c5cfdb]">
      Owner account details are protected from admin changes.
    </p>
  );

  const needsPlayerLink = !account.playerId;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/accounts"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#aeb8c6] hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Accounts
      </Link>

      {needsPlayerLink ? (
        <div className="flex items-start gap-4 rounded-xl border border-orange-500/30 bg-orange-500/10 p-5">
          <Link2Off className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
          <div className="min-w-0">
            <p className="font-semibold text-orange-300">No player linked — action required before approval</p>
            <p className="mt-1 text-sm text-[#c5cfdb]">
              This account registered as{" "}
              <span className="font-semibold text-white">
                {account.registrationName ?? account.email}
              </span>
              . This name did not exactly match any existing player record, so no link was created automatically.
            </p>
            <p className="mt-2 text-sm text-[#c5cfdb]">
              Search the <span className="font-medium text-white">Player Link</span> panel below to find the correct player and link them before approving.
              If they are a new member with no player record yet, create one in the database first.
            </p>
          </div>
        </div>
      ) : null}

      <SectionCard title={account.email} subtitle="Account, player link, profile metadata, and session controls." icon={UserRoundCog}>
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <div className="admin-panel-soft rounded-lg p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-[#8b95a5]">Role</div>
            <div className="mt-2 text-lg font-semibold capitalize text-white">{account.role}</div>
          </div>
          <div className="admin-panel-soft rounded-lg p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-[#8b95a5]">Status</div>
            <div className="mt-2 text-lg font-semibold capitalize text-white">{account.accountStatus}</div>
          </div>
          <div className={`rounded-lg p-4 ${needsPlayerLink ? "border border-orange-500/25 bg-orange-500/8" : "admin-panel-soft"}`}>
            <div className="text-xs uppercase tracking-[0.12em] text-[#8b95a5]">Linked player</div>
            {needsPlayerLink ? (
              <>
                <div className="mt-2 text-sm font-semibold text-orange-300">Not linked</div>
                {account.registrationName ? (
                  <div className="mt-0.5 text-xs text-[#8b95a5]">Registered as: {account.registrationName}</div>
                ) : null}
              </>
            ) : (
              <div className="mt-2 text-lg font-semibold text-white">{account.playerName}</div>
            )}
          </div>
          <div className="admin-panel-soft rounded-lg p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-[#8b95a5]">Last login</div>
            <div className="mt-2 text-sm font-semibold text-white">{formatDate(account.lastLogin)}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8b95a5]">Account controls</h3>
            {canMutate ? (
              <div className="grid gap-3">
                {account.accountStatus === "pending" ? (
                  !account.emailVerified ? (
                    <div className="flex items-start gap-3 rounded-lg border border-yellow-500/25 bg-yellow-500/8 p-4">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
                      <div className="text-sm">
                        <p className="font-semibold text-yellow-300">Email not verified</p>
                        <p className="mt-1 text-[#c5cfdb]">
                          This account cannot be approved until the member clicks the verification link sent to{" "}
                          <span className="font-medium text-white">{account.email}</span>.
                          Ask them to check their inbox (and spam folder).
                        </p>
                      </div>
                    </div>
                  ) : needsPlayerLink ? (
                    <div className="flex items-start gap-3 rounded-lg border border-orange-500/25 bg-orange-500/8 p-4">
                      <Link2Off className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                      <div className="text-sm">
                        <p className="font-semibold text-orange-300">Player not linked</p>
                        <p className="mt-1 text-[#c5cfdb]">
                          Link this account to an existing player record using the panel below before approving.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <form action={approveUserAction} className="admin-panel-soft flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
                      <input type="hidden" name="userId" value={account.id} />
                      <span className="text-sm text-[#c5cfdb]">Approve this pending account.</span>
                      <FormSubmitButton idleLabel="Approve" pendingLabel="Approving..." />
                    </form>
                  )
                ) : null}

                {account.accountStatus !== "disabled" ? (
                  <form action={disableUserAction} className="admin-panel-soft flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
                    <input type="hidden" name="userId" value={account.id} />
                    <span className="text-sm text-[#c5cfdb]">Disable account and revoke sessions.</span>
                    <input
                      name="confirmation"
                      placeholder="Type DISABLE"
                      className="h-10 rounded-full border border-[color:var(--border)] bg-transparent px-3 text-sm text-white outline-none placeholder:text-[#7f8a9a]"
                      required
                    />
                    <FormSubmitButton idleLabel="Disable account" pendingLabel="Disabling..." variant="danger" />
                  </form>
                ) : null}

                <form action={changeRoleAction} className="admin-panel-soft grid gap-3 rounded-lg p-4 sm:grid-cols-[1fr_auto]">
                  <input type="hidden" name="userId" value={account.id} />
                  <select name="role" defaultValue={account.role} className={fieldClassName()}>
                    <option value="player">Player</option>
                    <option value="admin">Admin</option>
                    {canAssignOwner ? <option value="owner">Owner</option> : null}
                  </select>
                  <FormSubmitButton idleLabel="Save role" pendingLabel="Saving..." variant="ghost" />
                </form>
              </div>
            ) : (
              <div className="admin-panel-soft flex items-center gap-3 rounded-lg p-4 text-sm text-[#c5cfdb]">
                <ShieldCheck className="h-5 w-5 text-[color:var(--accent)]" />
                Owner accounts can only be changed by another owner.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8b95a5]">Account facts</h3>
            <dl className="admin-panel-soft grid gap-3 rounded-lg p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#8b95a5]">Email verified</dt>
                <dd className="text-white">{account.emailVerified ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#8b95a5]">Created</dt>
                <dd className="text-white">{formatDate(account.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#8b95a5]">User ID</dt>
                <dd className="max-w-[18rem] truncate font-mono text-xs text-white">{account.id}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#8b95a5]">Player ID</dt>
                <dd className="max-w-[18rem] truncate font-mono text-xs text-white">{account.playerId || "None"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Player Link" subtitle="Search by display name or normalized name, then link the user explicitly." icon={LinkIcon}>
          {canMutate ? (
            <>
              <form action={searchPlayersForAccountAction} className="mt-6 flex gap-3">
                <input type="hidden" name="userId" value={account.id} />
                <label className="admin-panel-soft flex h-11 flex-1 items-center gap-3 rounded-lg px-3">
                  <Search className="h-4 w-4 text-[#8d97a7]" />
                  <input
                    name="playerSearch"
                    defaultValue={playerSearch}
                    placeholder="Search players"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#7f8a9a]"
                  />
                </label>
                <FormSubmitButton idleLabel="Search" pendingLabel="Searching..." variant="ghost" />
              </form>

              <form action={relinkUserAction} className="mt-4 space-y-3">
                <input type="hidden" name="userId" value={account.id} />
                {!account.playerId && account.playerMatches.length ? (
                  <div className="flex items-center gap-2 rounded-lg border border-yellow-400/15 bg-yellow-400/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-yellow-200">
                    <Sparkles className="h-4 w-4" />
                    {matchLabel}
                  </div>
                ) : null}
                <label className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] p-3 text-sm text-[#c5cfdb]">
                  <input type="radio" name="playerId" value="" defaultChecked={!account.playerId} />
                  Unlink account
                </label>
                {account.playerMatches.map((player) => (
                  <label key={player.id} className="flex items-start gap-3 rounded-lg border border-[color:var(--border)] p-3 text-sm text-[#c5cfdb]">
                    <input type="radio" name="playerId" value={player.id} defaultChecked={account.playerId === player.id} className="mt-1" />
                    <span>
                      <span className="block font-semibold text-white">{player.displayName}</span>
                      <span className="block text-xs text-[#8b95a5]">
                        {player.normalizedName} · {player.membershipStatus || "No membership status"} · {player.active === false ? "Inactive" : "Active"}
                      </span>
                    </span>
                  </label>
                ))}
                <FormSubmitButton idleLabel="Save player link" pendingLabel="Saving..." />
              </form>

              {needsPlayerLink ? (
                <>
                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-[color:var(--border)]" />
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8b95a5]">Or create new</span>
                    <div className="h-px flex-1 bg-[color:var(--border)]" />
                  </div>
                  <form action={createAndLinkPlayerAction} className="space-y-3">
                    <input type="hidden" name="userId" value={account.id} />
                    <p className="text-sm text-[#c5cfdb]">
                      Only use this if the person is a brand new member not yet in the players database.
                      If they are an existing player, search above instead.
                    </p>
                    <div className="flex gap-3">
                      <label className="admin-panel-soft flex h-11 flex-1 items-center gap-3 rounded-lg px-3">
                        <UserPlus className="h-4 w-4 shrink-0 text-[#8d97a7]" />
                        <input
                          name="displayName"
                          defaultValue={account.registrationName ?? ""}
                          placeholder="Full name for new player record"
                          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#7f8a9a]"
                          required
                        />
                      </label>
                      <FormSubmitButton idleLabel="Create & link" pendingLabel="Creating..." variant="ghost" />
                    </div>
                  </form>
                </>
              ) : null}
            </>
          ) : protectedOwnerMessage}
        </SectionCard>

        <SectionCard title="Profile Metadata" subtitle="Edit member profile fields stored on player_profiles." icon={Save}>
          {!canMutate ? (
            protectedOwnerMessage
          ) : account.playerId ? (
            <form action={updatePlayerProfileAction} className="mt-6 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="userId" value={account.id} />
              <input name="position" defaultValue={account.profile?.position ?? ""} placeholder="Position" className={inputClassName()} />
              <input name="shirtNumber" defaultValue={account.profile?.shirtNumber ?? ""} placeholder="Shirt number" className={inputClassName()} />
              <input name="bats" defaultValue={account.profile?.bats ?? ""} placeholder="Bats" className={inputClassName()} />
              <input name="throws" defaultValue={account.profile?.throws ?? ""} placeholder="Throws" className={inputClassName()} />
              <input name="membershipStatus" defaultValue={account.profile?.membershipStatus ?? ""} placeholder="Membership status" className={inputClassName()} />
              <input name="memberSince" type="date" defaultValue={account.profile?.memberSince ?? ""} className={inputClassName()} />
              <input name="profileImageUrl" defaultValue={account.profile?.profileImageUrl ?? ""} placeholder="Profile image URL" className={`${inputClassName()} sm:col-span-2`} />
              <div className="sm:col-span-2">
                <FormSubmitButton idleLabel="Save profile" pendingLabel="Saving..." />
              </div>
            </form>
          ) : (
            <p className="mt-6 rounded-lg border border-[color:var(--border)] p-4 text-sm text-[#c5cfdb]">
              Link this account to a player before editing profile metadata.
            </p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Admin Notes" subtitle="Private review context for this account." icon={ClipboardPen}>
        {canMutate ? (
          <form action={addAdminNoteAction} className="mt-6 space-y-3">
            <input type="hidden" name="userId" value={account.id} />
            <textarea
              name="note"
              rows={4}
              placeholder="Add a private admin note"
              className="admin-panel-soft w-full rounded-lg px-3 py-3 text-sm text-white outline-none placeholder:text-[#7f8a9a]"
            />
            <FormSubmitButton idleLabel="Save note" pendingLabel="Saving..." />
          </form>
        ) : protectedOwnerMessage}
        <div className="mt-5 space-y-3">
          {account.notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-[color:var(--border)] p-3 text-sm">
              <div className="text-white">{note.note}</div>
              <div className="mt-2 text-xs text-[#8b95a5]">
                {note.actorEmail || "Unknown admin"} · {formatDate(note.createdAt)}
              </div>
            </div>
          ))}
          {!account.notes.length ? (
            <p className="text-sm text-[#8b95a5]">No notes yet.</p>
          ) : null}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Change Email" subtitle="Update the login email address. Clears email verification and is owner-only." icon={AtSign}>
          {adminUser.role === "owner" && canMutate ? (
            <form action={updateEmailAction} className="mt-6 flex flex-wrap gap-3">
              <input type="hidden" name="userId" value={account.id} />
              <input
                name="email"
                type="email"
                defaultValue={account.email}
                placeholder="New email address"
                className={`${inputClassName()} min-w-[18rem] flex-1`}
                required
              />
              <FormSubmitButton idleLabel="Update email" pendingLabel="Updating..." variant="ghost" />
            </form>
          ) : (
            <p className="mt-6 rounded-lg border border-[color:var(--border)] p-4 text-sm text-[#c5cfdb]">
              Email changes are owner-only.
            </p>
          )}
        </SectionCard>

        <SectionCard title="Password Reset" subtitle="Set a temporary password, hash it securely, and revoke existing sessions." icon={KeyRound}>
          {canSetTemporaryPassword ? (
            <form action={resetPasswordAction} className="mt-6 flex flex-wrap gap-3">
              <input type="hidden" name="userId" value={account.id} />
              <input
                name="password"
                type="password"
                minLength={12}
                placeholder="Temporary password"
                className={`${inputClassName()} min-w-[18rem] flex-1`}
                required
              />
              <input
                name="confirmation"
                placeholder="Type RESET"
                className={`${inputClassName()} min-w-[10rem] flex-1`}
                required
              />
              <FormSubmitButton idleLabel="Reset password" pendingLabel="Resetting..." variant="danger" />
            </form>
          ) : (
            <p className="mt-6 rounded-lg border border-[color:var(--border)] p-4 text-sm text-[#c5cfdb]">
              Temporary password resets are owner-only.
            </p>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Sessions" subtitle="Active devices without exposing raw session tokens." icon={Monitor}>
          <div className="mt-6 space-y-3">
            {account.sessions.map((session) => (
              <div key={session.id} className="admin-panel-soft flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{session.deviceName || "Unknown device"}</div>
                  <div className="mt-1 text-xs text-[#8b95a5]">
                    Last seen {formatDate(session.lastSeen)} · Expires {formatDate(session.expiresAt)}
                  </div>
                  <div className="mt-1 text-xs text-[#8b95a5]">IP {session.ipAddress || "Unknown"}</div>
                </div>
                {canMutate ? (
                  <form action={revokeSessionAction}>
                    <input type="hidden" name="userId" value={account.id} />
                    <input type="hidden" name="sessionId" value={session.id} />
                    <input type="hidden" name="confirmation" value="REVOKE" />
                    <FormSubmitButton idleLabel="Revoke" pendingLabel="Revoking..." variant="danger" />
                  </form>
                ) : null}
              </div>
            ))}
            {account.sessions.length && canMutate ? (
              <form action={revokeAllSessionsAction}>
                <input type="hidden" name="userId" value={account.id} />
                <input
                  name="confirmation"
                  placeholder="Type LOGOUT"
                  className="mb-3 h-10 rounded-full border border-[color:var(--border)] bg-transparent px-3 text-sm text-white outline-none placeholder:text-[#7f8a9a]"
                  required
                />
                <FormSubmitButton idleLabel="Logout all devices" pendingLabel="Revoking..." variant="danger" />
              </form>
            ) : !account.sessions.length ? (
              <p className="rounded-lg border border-[color:var(--border)] p-4 text-sm text-[#c5cfdb]">
                No active sessions.
              </p>
            ) : (
              protectedOwnerMessage
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Audit History" subtitle="Recent admin changes for this account and linked profile." icon={History}>
        <div className="mt-6 space-y-3">
          {account.auditLog.map((entry) => (
            <div key={entry.id} className="admin-panel-soft rounded-lg p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {entry.action}
                    {entry.fieldName ? (
                      <span className="ml-2 text-[#8b95a5]">/ {entry.fieldName}</span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-[#8b95a5]">
                    {entry.actorEmail || "Unknown admin"} · {formatDate(entry.createdAt)}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                <div className="rounded-lg border border-[color:var(--border)] p-3">
                  <div className="font-semibold uppercase tracking-[0.1em] text-[#8b95a5]">Previous</div>
                  <div className="mt-1 break-words text-[#c5cfdb]">
                    {formatAuditValue(entry.previousValue)}
                  </div>
                </div>
                <div className="rounded-lg border border-[color:var(--border)] p-3">
                  <div className="font-semibold uppercase tracking-[0.1em] text-[#8b95a5]">New</div>
                  <div className="mt-1 break-words text-white">
                    {formatAuditValue(entry.newValue)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!account.auditLog.length ? (
            <p className="rounded-lg border border-[color:var(--border)] p-4 text-sm text-[#c5cfdb]">
              No audit entries yet.
            </p>
          ) : null}
        </div>
      </SectionCard>

      {adminUser.role === "owner" && !isOwnerTarget ? (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-red-400">Danger Zone</h2>
          <p className="mt-1 text-sm text-[#c5cfdb]">
            Permanently delete this account and all login data. The linked player record and their stats are unaffected.
            If they rejoin the club they can register a new account.
          </p>
          <form action={deleteUserAction} className="mt-4 flex flex-wrap items-center gap-3">
            <input type="hidden" name="userId" value={account.id} />
            <input
              name="confirmation"
              placeholder="Type DELETE to confirm"
              className="h-10 rounded-full border border-red-900/60 bg-transparent px-3 text-sm text-white outline-none placeholder:text-[#7f8a9a]"
              required
            />
            <FormSubmitButton idleLabel="Delete account" pendingLabel="Deleting..." variant="danger" />
          </form>
        </div>
      ) : null}
    </div>
  );
}
