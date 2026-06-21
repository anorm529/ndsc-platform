import "server-only";

import { councilQuery } from "@/db/council-db";

// ─── Action Items ─────────────────────────────────────────────────────────────

export interface ActionItem {
  id: string;
  meetingId: string | null;
  meetingTitle: string | null;
  assignedTo: string | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: "open" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getMyOpenActions(userId: string): Promise<ActionItem[]> {
  const result = await councilQuery<{
    id: string;
    meeting_id: string | null;
    meeting_title: string | null;
    assigned_to: string | null;
    title: string;
    description: string | null;
    due_date: string | null;
    status: string;
    priority: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT a.id, a.meeting_id, m.title as meeting_title, a.assigned_to,
            a.title, a.description, a.due_date::text, a.status, a.priority,
            a.created_by, a.created_at, a.updated_at
     FROM action_items a
     LEFT JOIN council_meetings m ON m.id = a.meeting_id
     WHERE a.assigned_to = $1 AND a.status IN ('open', 'in_progress')
     ORDER BY
       CASE a.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
       a.due_date ASC NULLS LAST`,
    [userId]
  );

  return result.rows.map(mapAction);
}

export async function getAllActions(opts?: { status?: string }): Promise<ActionItem[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (opts?.status) {
    values.push(opts.status);
    conditions.push(`a.status = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await councilQuery<{
    id: string;
    meeting_id: string | null;
    meeting_title: string | null;
    assigned_to: string | null;
    title: string;
    description: string | null;
    due_date: string | null;
    status: string;
    priority: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT a.id, a.meeting_id, m.title as meeting_title, a.assigned_to,
            a.title, a.description, a.due_date::text, a.status, a.priority,
            a.created_by, a.created_at, a.updated_at
     FROM action_items a
     LEFT JOIN council_meetings m ON m.id = a.meeting_id
     ${where}
     ORDER BY
       CASE a.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
       CASE a.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
       a.due_date ASC NULLS LAST`,
    values
  );

  return result.rows.map(mapAction);
}

function mapAction(r: {
  id: string; meeting_id: string | null; meeting_title: string | null;
  assigned_to: string | null; title: string; description: string | null;
  due_date: string | null; status: string; priority: string;
  created_by: string; created_at: Date; updated_at: Date;
}): ActionItem {
  return {
    id: r.id,
    meetingId: r.meeting_id,
    meetingTitle: r.meeting_title,
    assignedTo: r.assigned_to,
    title: r.title,
    description: r.description,
    dueDate: r.due_date,
    status: r.status as ActionItem["status"],
    priority: r.priority as ActionItem["priority"],
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export interface Meeting {
  id: string;
  title: string;
  type: "agm" | "council" | "committee";
  scheduledAt: Date;
  location: string | null;
  agenda: string | null;
  minutes: string | null;
  status: "scheduled" | "completed" | "cancelled";
  createdBy: string;
  createdAt: Date;
}

export async function getUpcomingMeetings(limit = 5): Promise<Meeting[]> {
  const result = await councilQuery<{
    id: string; title: string; type: string; scheduled_at: Date;
    location: string | null; agenda: string | null; minutes: string | null;
    status: string; created_by: string; created_at: Date;
  }>(
    `SELECT id, title, type, scheduled_at, location, agenda, minutes, status, created_by, created_at
     FROM council_meetings
     WHERE scheduled_at >= NOW() AND status = 'scheduled'
     ORDER BY scheduled_at ASC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map(mapMeeting);
}

export async function getAllMeetings(): Promise<Meeting[]> {
  const result = await councilQuery<{
    id: string; title: string; type: string; scheduled_at: Date;
    location: string | null; agenda: string | null; minutes: string | null;
    status: string; created_by: string; created_at: Date;
  }>(
    `SELECT id, title, type, scheduled_at, location, agenda, minutes, status, created_by, created_at
     FROM council_meetings
     ORDER BY scheduled_at DESC`
  );
  return result.rows.map(mapMeeting);
}

export async function getMeetingById(id: string): Promise<Meeting | null> {
  const result = await councilQuery<{
    id: string; title: string; type: string; scheduled_at: Date;
    location: string | null; agenda: string | null; minutes: string | null;
    status: string; created_by: string; created_at: Date;
  }>(
    `SELECT id, title, type, scheduled_at, location, agenda, minutes, status, created_by, created_at
     FROM council_meetings WHERE id = $1`,
    [id]
  );
  if (!result.rows[0]) return null;
  return mapMeeting(result.rows[0]);
}

function mapMeeting(r: {
  id: string; title: string; type: string; scheduled_at: Date;
  location: string | null; agenda: string | null; minutes: string | null;
  status: string; created_by: string; created_at: Date;
}): Meeting {
  return {
    id: r.id, title: r.title, type: r.type as Meeting["type"],
    scheduledAt: r.scheduled_at, location: r.location, agenda: r.agenda,
    minutes: r.minutes, status: r.status as Meeting["status"],
    createdBy: r.created_by, createdAt: r.created_at,
  };
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  openActions: number;
  upcomingMeetings: number;
  overdueActions: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await councilQuery<{
    open_actions: string;
    upcoming_meetings: string;
    overdue_actions: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM action_items WHERE status IN ('open','in_progress'))::text AS open_actions,
       (SELECT COUNT(*) FROM council_meetings WHERE scheduled_at >= NOW() AND status = 'scheduled')::text AS upcoming_meetings,
       (SELECT COUNT(*) FROM action_items WHERE status IN ('open','in_progress') AND due_date < CURRENT_DATE)::text AS overdue_actions`
  );

  const row = result.rows[0];
  return {
    openActions: parseInt(row?.open_actions ?? "0", 10),
    upcomingMeetings: parseInt(row?.upcoming_meetings ?? "0", 10),
    overdueActions: parseInt(row?.overdue_actions ?? "0", 10),
  };
}

// ─── Fees summary ─────────────────────────────────────────────────────────────

export interface FeeSummary {
  seasonId: string;
  label: string;
  year: number;
  totalPlayers: number;
  paidCount: number;
  totalDue: number;
  totalPaid: number;
}

export async function getActiveFeeSummary(): Promise<FeeSummary | null> {
  const result = await councilQuery<{
    season_id: string; label: string; year: number;
    total_players: string; paid_count: string;
    total_due: string; total_paid: string;
  }>(
    `SELECT
       fs.id AS season_id,
       fs.label,
       fs.year,
       COUNT(pf.id)::text AS total_players,
       SUM(CASE WHEN COALESCE(paid.amount,0) >= pf.amount_due THEN 1 ELSE 0 END)::text AS paid_count,
       COALESCE(SUM(pf.amount_due), 0)::text AS total_due,
       COALESCE(SUM(paid.amount), 0)::text AS total_paid
     FROM fee_seasons fs
     LEFT JOIN player_fees pf ON pf.season_id = fs.id
     LEFT JOIN (
       SELECT player_fee_id, SUM(amount) AS amount
       FROM fee_payments GROUP BY player_fee_id
     ) paid ON paid.player_fee_id = pf.id
     WHERE fs.is_active = true
     GROUP BY fs.id, fs.label, fs.year
     LIMIT 1`
  );

  if (!result.rows[0]) return null;
  const r = result.rows[0];
  return {
    seasonId: r.season_id,
    label: r.label,
    year: r.year,
    totalPlayers: parseInt(r.total_players, 10),
    paidCount: parseInt(r.paid_count, 10),
    totalDue: parseFloat(r.total_due),
    totalPaid: parseFloat(r.total_paid),
  };
}

// ─── Club accounts balance ────────────────────────────────────────────────────

export interface AccountBalance {
  id: string;
  name: string;
  balance: number;
}

export async function getAccountBalances(): Promise<AccountBalance[]> {
  const result = await councilQuery<{
    id: string;
    name: string;
    balance: string;
  }>(
    `SELECT
       a.id,
       a.name,
       COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0)::text AS balance
     FROM club_accounts a
     LEFT JOIN account_transactions t ON t.account_id = a.id
     WHERE a.is_active = true
     GROUP BY a.id, a.name
     ORDER BY a.name`
  );

  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    balance: parseFloat(r.balance),
  }));
}

// ─── Player Profiles ──────────────────────────────────────────────────────────

export interface PlayerProfile {
  playerId: string;
  yearOfBirth: number | null;
  postcode: string | null;
  isRookie: boolean;
  isUmpire: boolean;
  notes: string | null;
}

export async function getPlayerProfiles(): Promise<Map<string, PlayerProfile>> {
  const result = await councilQuery<{
    player_id: string;
    year_of_birth: number | null;
    postcode: string | null;
    is_rookie: boolean;
    is_umpire: boolean;
    notes: string | null;
  }>(`SELECT player_id, year_of_birth, postcode, is_rookie, is_umpire, notes FROM player_profiles`);

  const map = new Map<string, PlayerProfile>();
  for (const r of result.rows) {
    map.set(r.player_id, {
      playerId: r.player_id,
      yearOfBirth: r.year_of_birth,
      postcode: r.postcode,
      isRookie: r.is_rookie,
      isUmpire: r.is_umpire,
      notes: r.notes,
    });
  }
  return map;
}

export async function upsertPlayerProfile(
  playerId: string,
  data: { yearOfBirth: number | null; postcode: string | null; isRookie: boolean; isUmpire: boolean; notes: string | null }
): Promise<void> {
  await councilQuery(
    `INSERT INTO player_profiles (player_id, year_of_birth, postcode, is_rookie, is_umpire, notes, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (player_id) DO UPDATE SET
       year_of_birth = EXCLUDED.year_of_birth,
       postcode      = EXCLUDED.postcode,
       is_rookie     = EXCLUDED.is_rookie,
       is_umpire     = EXCLUDED.is_umpire,
       notes         = EXCLUDED.notes,
       updated_at    = NOW()`,
    [playerId, data.yearOfBirth, data.postcode, data.isRookie, data.isUmpire, data.notes]
  );
}

// ─── Fee Status ───────────────────────────────────────────────────────────────

export type FeeStatus = "paid" | "partial" | "unpaid";

export interface PlayerFeeStatus {
  playerId: string;
  feeType: string;
  amountDue: number;
  amountPaid: number;
  status: FeeStatus;
}

export async function getCurrentFeeStatuses(): Promise<Map<string, PlayerFeeStatus>> {
  // Use the active season; fall back to the most recent season
  const seasonResult = await councilQuery<{ id: string }>(
    `SELECT id FROM fee_seasons
     ORDER BY is_active DESC, year DESC
     LIMIT 1`
  );
  const seasonId = seasonResult.rows[0]?.id;
  if (!seasonId) return new Map();

  const result = await councilQuery<{
    player_id: string;
    fee_type: string;
    amount_due: string;
    amount_paid: string;
  }>(
    `SELECT pf.player_id, pf.fee_type, pf.amount_due::text,
            COALESCE(SUM(fp.amount), 0)::text AS amount_paid
     FROM player_fees pf
     LEFT JOIN fee_payments fp ON fp.player_fee_id = pf.id
     WHERE pf.season_id = $1
     GROUP BY pf.player_id, pf.fee_type, pf.amount_due`,
    [seasonId]
  );

  const map = new Map<string, PlayerFeeStatus>();
  for (const r of result.rows) {
    const due = parseFloat(r.amount_due);
    const paid = parseFloat(r.amount_paid);
    const status: FeeStatus = paid >= due ? "paid" : paid > 0 ? "partial" : "unpaid";
    map.set(r.player_id, {
      playerId: r.player_id,
      feeType: r.fee_type,
      amountDue: due,
      amountPaid: paid,
      status,
    });
  }
  return map;
}
