import { cookies } from "next/headers";
import { cache } from "react";
import {
  getUserByEmail,
  verifyPassword,
  validateSession,
  createSession,
  deleteSession,
} from "@ndsc/auth";
import { db } from "./fantasy-db";

const SESSION_COOKIE = "fantasy_session";

export type MainUser = {
  id: string;
  email: string;
  role: string;
  player_id: string | null;
  account_status: string;
  display_name: string | null;
  gender: string | null;
};

export { verifyPassword };

/** Look up a user from the auth DB and optionally enrich with player data from the main DB. */
export async function getAuthUserByEmail(email: string): Promise<MainUser | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;

  // Fetch player display_name and gender from main DB if linked
  let display_name: string | null = null;
  let gender: string | null = null;

  if (user.playerId) {
    const { getMainDb } = await import("./main-db");
    const pool = getMainDb();
    const res = await pool.query<{ display_name: string; gender: string }>(
      "SELECT display_name, gender FROM players WHERE id = $1",
      [user.playerId]
    );
    display_name = res.rows[0]?.display_name ?? null;
    gender = res.rows[0]?.gender ?? null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    player_id: user.playerId,
    account_status: user.accountStatus,
    display_name,
    gender,
  };
}

export type Session = {
  fantasyUserId: string;
  memberUserId: string;
};

export async function createFantasySession(memberUserId: string, teamName?: string) {
  // Upsert the FantasyUser record (fantasy-specific data)
  let fantasyUser = await db.fantasyUser.findUnique({ where: { memberUserId } });
  if (!fantasyUser) {
    fantasyUser = await db.fantasyUser.create({
      data: { memberUserId, teamName: teamName ?? "My Fantasy Team" },
    });
  }

  // Create session in the shared auth DB
  const rawToken = await createSession(memberUserId, "fantasy");

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return { fantasyUserId: fantasyUser.id };
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token).catch(() => undefined);
  cookieStore.delete(SESSION_COOKIE);
}

// cache() deduplicates within one React render tree (layout + page share the result)
export const getSession = cache(async (): Promise<Session | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sessionUser = await validateSession(token);
  if (!sessionUser || sessionUser.accountStatus !== "active") return null;

  // Look up the FantasyUser by the memberUserId from the auth session
  const fantasyUser = await db.fantasyUser.findUnique({
    where: { memberUserId: sessionUser.userId },
  });
  if (!fantasyUser) return null;

  return {
    fantasyUserId: fantasyUser.id,
    memberUserId: sessionUser.userId,
  };
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
    throw new Error("unreachable");
  }
  return session;
}

export async function getCurrentSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}
