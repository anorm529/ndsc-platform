import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isIP } from "node:net";
import { dbQuery } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  getUserByEmail,
  createUser,
  createSession,
  validateSession,
  deleteSession,
  deleteAllUserSessions,
  getUserSessions,
  createPasswordResetToken,
  consumePasswordResetToken,
  updateUserPassword,
  updateLastLogin,
  emailExists,
  isUserRole,
  isAccountStatus,
} from "@ndsc/auth";

export { hashPassword, verifyPassword };

export const SESSION_COOKIE = "ndsc_session";

export type UserRole = "player" | "admin" | "owner";
export type AccountStatus = "active" | "pending" | "disabled";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
  playerId: string;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  playerName: string;
  gender?: string | null;
};

export type AccountSession = {
  id: string;
  createdAt: string;
  lastSeen: string;
  expiresAt: string;
  deviceName: string | null;
  ipAddress: string | null;
  current: boolean;
};

export type PlayerProfile = {
  position: string | null;
  bats: string | null;
  throws: string | null;
  shirtNumber: number | null;
  profileImageUrl: string | null;
  membershipStatus: string;
  memberSince: number | null;
};

export type PlayerProfileInput = {
  position?: string | null;
  bats?: string | null;
  throws?: string | null;
  shirtNumber?: number | null;
  profileImageUrl?: string | null;
  membershipStatus?: string | null;
  memberSince?: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizedPlayerName(name: string) {
  return name.trim().toLowerCase();
}

function cleanOptionalText(value: string | null | undefined) {
  const clean = value?.trim();
  return clean ? clean : null;
}

function cleanMemberSince(value: number | null | undefined) {
  if (value == null) return null;
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2014 || year > 2100) {
    throw new Error("Member since must be a valid year from 2014 onwards.");
  }
  return year;
}

function cleanShirtNumber(value: number | null | undefined) {
  if (value == null) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 99) {
    throw new Error("Shirt number must be between 0 and 99.");
  }
  return number;
}

// ─── Player helpers (main DB) ─────────────────────────────────────────────────

async function findExistingPlayerId(name: string) {
  const result = await dbQuery<{ id: string }>(
    `SELECT id::text AS id FROM public.players
     WHERE normalized_name = $1 ORDER BY display_name LIMIT 1`,
    [normalizedPlayerName(name)]
  );
  return result.rows[0]?.id ?? null;
}

async function createPlayer(name: string) {
  try {
    const result = await dbQuery<{ id: string }>(
      `INSERT INTO public.players (display_name) VALUES ($1) RETURNING id::text AS id`,
      [name]
    );
    return result.rows[0]?.id;
  } catch (error) {
    if (error instanceof Error && /duplicate key|unique/i.test(error.message)) {
      return findExistingPlayerId(name);
    }
    throw error;
  }
}

export async function findOrCreatePlayer(nameInput: string) {
  const name = normalizeName(nameInput);
  if (name.length < 2) throw new Error("Please enter your full name.");
  const existingId = await findExistingPlayerId(name);
  if (existingId) return existingId;
  const createdId = await createPlayer(name);
  if (!createdId) throw new Error("Could not create player record.");
  return createdId;
}

// ─── Registration ─────────────────────────────────────────────────────────────

export async function registerUser({ name, email, password }: { name: string; email: string; password: string }) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.includes("@")) throw new Error("Please enter a valid email address.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  if (await emailExists(cleanEmail)) {
    throw new Error("An account already exists for that email address.");
  }

  const playerId = await findOrCreatePlayer(name);
  const passwordHash = await hashPassword(password);

  const user = await createUser({
    email: cleanEmail,
    passwordHash,
    role: "player",
    accountStatus: "pending",
    playerId,
  });

  return user.id;
}

// ─── Authentication ───────────────────────────────────────────────────────────

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ ok: true; userId: string } | { ok: false; reason: "invalid" | "pending" | "disabled" }> {
  const user = await getUserByEmail(email);
  if (!user) return { ok: false, reason: "invalid" };

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false, reason: "invalid" };
  if (user.accountStatus === "pending") return { ok: false, reason: "pending" };
  if (user.accountStatus === "disabled") return { ok: false, reason: "disabled" };

  return { ok: true, userId: user.id };
}

// ─── Session management ───────────────────────────────────────────────────────

async function getRequestMetadata() {
  const h = await headers();
  const deviceName = h.get("user-agent")?.slice(0, 240) ?? null;
  const forwardedFor = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const rawIp = forwardedFor || h.get("x-real-ip") || "";
  const ipAddress = isIP(rawIp) ? rawIp : undefined;
  return { deviceName: deviceName ?? undefined, ipAddress };
}

export async function createUserSession(userId: string) {
  const { deviceName, ipAddress } = await getRequestMetadata();
  const rawToken = await createSession(userId, "website", deviceName, ipAddress);

  await updateLastLogin(userId);

  const jar = await cookies();
  jar.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function destroyCurrentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token).catch(() => undefined);
  jar.delete(SESSION_COOKIE);
}

export async function destroyOtherSessions(userId: string) {
  const jar = await cookies();
  const currentToken = jar.get(SESSION_COOKIE)?.value;
  await deleteAllUserSessions(userId, currentToken);
}

export async function listUserSessions(userId: string): Promise<AccountSession[]> {
  const jar = await cookies();
  const currentToken = jar.get(SESSION_COOKIE)?.value;
  const sessions = await getUserSessions(userId);

  return sessions.map((s) => {
    const tokenMatches = currentToken
      ? require("crypto").createHash("sha256").update(currentToken).digest("hex") === s.sessionToken
      : false;
    return {
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      lastSeen: s.lastSeen.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      deviceName: s.deviceName,
      ipAddress: s.ipAddress,
      current: tokenMatches,
    };
  });
}

// ─── Current user ─────────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sessionUser = await validateSession(token);
  if (!sessionUser || sessionUser.accountStatus !== "active" || !sessionUser.playerId) return null;

  const role = isUserRole(sessionUser.role) ? sessionUser.role : null;
  const accountStatus = isAccountStatus(sessionUser.accountStatus) ? sessionUser.accountStatus : null;
  if (!role || !accountStatus) return null;

  const result = await dbQuery<{ display_name: string; gender: string | null }>(
    "SELECT display_name, gender FROM public.players WHERE id = $1::uuid LIMIT 1",
    [sessionUser.playerId]
  );
  const player = result.rows[0];

  return {
    id: sessionUser.userId,
    email: sessionUser.email,
    role,
    playerId: sessionUser.playerId,
    emailVerified: sessionUser.emailVerified,
    accountStatus,
    playerName: player?.display_name || sessionUser.email,
    gender: player?.gender ?? null,
  };
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/members");
  return user;
}

// ─── Password management ──────────────────────────────────────────────────────

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  if (newPassword.length < 8) throw new Error("New password must be at least 8 characters.");

  const user = await import("@ndsc/auth").then((m) => m.getUserById(userId));
  if (!user) throw new Error("Account not found.");

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is incorrect.");

  const newHash = await hashPassword(newPassword);
  await updateUserPassword(userId, newHash);
}

export async function createPasswordReset(email: string) {
  const user = await getUserByEmail(email);
  if (!user) return null;

  const token = await createPasswordResetToken(user.id);
  return { token, userId: user.id, email: user.email };
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");

  const userId = await consumePasswordResetToken(token);
  if (!userId) throw new Error("Reset link is invalid or expired.");

  const newHash = await hashPassword(newPassword);
  await updateUserPassword(userId, newHash);
  await deleteAllUserSessions(userId);
}

// ─── Player profile (main DB) ─────────────────────────────────────────────────

export async function getPlayerProfile(playerId: string): Promise<PlayerProfile> {
  const result = await dbQuery<{
    position: string | null;
    bats: string | null;
    throws: string | null;
    profile_image_url: string | null;
    membership_status: string | null;
    member_since: number | null;
    shirt_number: number | null;
  }>(
    `SELECT position, bats, throws, shirt_number, profile_image_url, membership_status, member_since
     FROM public.player_profiles WHERE player_id = $1::uuid LIMIT 1`,
    [playerId]
  );
  const row = result.rows[0];
  return {
    position: row?.position ?? null,
    bats: row?.bats ?? null,
    throws: row?.throws ?? null,
    shirtNumber: row?.shirt_number ?? null,
    profileImageUrl: row?.profile_image_url ?? null,
    membershipStatus: row?.membership_status ?? "Active Member",
    memberSince: row?.member_since ?? 2014,
  };
}

export async function updatePlayerProfile(playerId: string, input: PlayerProfileInput) {
  const position = cleanOptionalText(input.position);
  const bats = cleanOptionalText(input.bats);
  const throws_ = cleanOptionalText(input.throws);
  const shirtNumber = cleanShirtNumber(input.shirtNumber);
  const profileImageUrl = cleanOptionalText(input.profileImageUrl);
  const membershipStatus = cleanOptionalText(input.membershipStatus) ?? "Active Member";
  const memberSince = cleanMemberSince(input.memberSince) ?? 2014;

  await dbQuery(
    `INSERT INTO public.player_profiles
       (player_id, position, bats, throws, shirt_number, profile_image_url, membership_status, member_since)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (player_id) DO UPDATE SET
       position = EXCLUDED.position, bats = EXCLUDED.bats, throws = EXCLUDED.throws,
       shirt_number = EXCLUDED.shirt_number, profile_image_url = EXCLUDED.profile_image_url,
       membership_status = EXCLUDED.membership_status, member_since = EXCLUDED.member_since,
       updated_at = NOW()`,
    [playerId, position, bats, throws_, shirtNumber, profileImageUrl, membershipStatus, memberSince]
  );
}
