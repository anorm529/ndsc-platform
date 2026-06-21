import "server-only";

import { councilQuery } from "@/db/council-db";
import type { EnrollmentRow } from "@/lib/season-queries";

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

export async function getAllActions(opts?: { status?: string; assignedTo?: string }): Promise<ActionItem[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (opts?.status) {
    values.push(opts.status);
    conditions.push(`a.status = $${values.length}`);
  }

  if (opts?.assignedTo) {
    values.push(opts.assignedTo);
    conditions.push(`a.assigned_to = $${values.length}`);
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

export async function getFeeStatusesForYear(year: number): Promise<Map<string, PlayerFeeStatus>> {
  const seasonResult = await councilQuery<{ id: string }>(
    `SELECT id FROM fee_seasons WHERE year = $1 ORDER BY is_active DESC LIMIT 1`,
    [year],
  );
  const seasonId = seasonResult.rows[0]?.id;
  if (!seasonId) return getCurrentFeeStatuses();

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
    [seasonId],
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

// ─── Membership snapshot ──────────────────────────────────────────────────────

export interface SnapshotResult {
  inserted: number;
  skipped: number;
}

export interface MembershipSnapshot {
  id: string;
  seasonYear: number;
  playerId: string;
  playerName: string;
  gender: string | null;
  teamName: string | null;
  feeStatus: string | null;
  feeType: string | null;
  amountDue: number | null;
  amountPaid: number | null;
  isRookie: boolean;
  isUmpire: boolean;
  snapshottedAt: Date;
}

export async function takeSeasonArchiveSnapshot(
  seasonYear: number,
  enrollments: EnrollmentRow[],
  profileMap: Map<string, PlayerProfile>,
  feeStatusMap: Map<string, PlayerFeeStatus>,
  snapshottedBy: string,
): Promise<SnapshotResult> {
  let inserted = 0;
  let skipped = 0;

  for (const enr of enrollments) {
    const name = enr.registrationName || enr.displayName || enr.email?.split("@")[0] || "Unknown";
    const profile = profileMap.get(enr.playerId);
    const fee = feeStatusMap.get(enr.playerId);

    const result = await councilQuery<{ was_inserted: boolean }>(
      `INSERT INTO membership_snapshots
        (season_year, player_id, player_name, gender, team_name,
         fee_status, fee_type, amount_due, amount_paid,
         is_rookie, is_umpire, snapshotted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (player_id, season_year) DO UPDATE SET
         player_name    = EXCLUDED.player_name,
         gender         = EXCLUDED.gender,
         team_name      = EXCLUDED.team_name,
         fee_status     = EXCLUDED.fee_status,
         fee_type       = EXCLUDED.fee_type,
         amount_due     = EXCLUDED.amount_due,
         amount_paid    = EXCLUDED.amount_paid,
         is_rookie      = EXCLUDED.is_rookie,
         is_umpire      = EXCLUDED.is_umpire,
         snapshotted_at = NOW(),
         snapshotted_by = EXCLUDED.snapshotted_by
       RETURNING (xmax = 0) AS was_inserted`,
      [
        seasonYear,
        enr.playerId,
        name,
        enr.gender ?? null,
        enr.currentTeamName ?? null,
        fee?.status ?? null,
        fee?.feeType ?? null,
        fee?.amountDue ?? null,
        fee?.amountPaid ?? null,
        profile?.isRookie ?? false,
        profile?.isUmpire ?? false,
        snapshottedBy,
      ],
    );

    if (result.rows[0]?.was_inserted) inserted++; else skipped++;
  }

  return { inserted, skipped };
}

export async function getSeasonArchiveYears(): Promise<number[]> {
  const result = await councilQuery<{ season_year: number }>(
    `SELECT DISTINCT season_year FROM membership_snapshots ORDER BY season_year DESC`,
  );
  return result.rows.map((r) => r.season_year);
}

export async function getMembershipSnapshot(year: number): Promise<MembershipSnapshot[]> {
  const result = await councilQuery<{
    id: string;
    season_year: number;
    player_id: string;
    player_name: string;
    gender: string | null;
    team_name: string | null;
    fee_status: string | null;
    fee_type: string | null;
    amount_due: string | null;
    amount_paid: string | null;
    is_rookie: boolean;
    is_umpire: boolean;
    snapshotted_at: Date;
  }>(
    `SELECT id, season_year, player_id::text, player_name, gender, team_name,
            fee_status, fee_type, amount_due::text, amount_paid::text,
            is_rookie, is_umpire, snapshotted_at
     FROM membership_snapshots
     WHERE season_year = $1
     ORDER BY team_name ASC NULLS LAST, player_name ASC`,
    [year],
  );

  return result.rows.map((r) => ({
    id: r.id,
    seasonYear: r.season_year,
    playerId: r.player_id,
    playerName: r.player_name,
    gender: r.gender,
    teamName: r.team_name,
    feeStatus: r.fee_status,
    feeType: r.fee_type,
    amountDue: r.amount_due ? parseFloat(r.amount_due) : null,
    amountPaid: r.amount_paid ? parseFloat(r.amount_paid) : null,
    isRookie: r.is_rookie,
    isUmpire: r.is_umpire,
    snapshottedAt: r.snapshotted_at,
  }));
}

// ─── Year-on-year stats ───────────────────────────────────────────────────────

export interface YearStats {
  year: number;
  total: number;
  female: number;
  male: number;
  rookies: number;
  umpires: number;
  paid: number;
  partial: number;
  unpaid: number;
  noFeeRecord: number;
  totalDue: number;
  totalPaid: number;
  returners: number;
  newPlayers: number;
  teamBreakdown: { teamName: string; count: number }[];
}

export async function getYearOnYearStats(): Promise<YearStats[]> {
  // Summary per year with returner calc via self-join
  const summaryResult = await councilQuery<{
    year: number;
    total: string;
    female: string;
    male: string;
    rookies: string;
    umpires: string;
    paid: string;
    partial: string;
    unpaid: string;
    no_fee_record: string;
    total_due: string;
    total_paid: string;
    returners: string;
    new_players: string;
  }>(`
    SELECT
      ms.season_year                                                        AS year,
      COUNT(*)::text                                                        AS total,
      COUNT(*) FILTER (WHERE ms.gender ILIKE 'female')::text               AS female,
      COUNT(*) FILTER (WHERE ms.gender ILIKE 'male')::text                 AS male,
      COUNT(*) FILTER (WHERE ms.is_rookie)::text                           AS rookies,
      COUNT(*) FILTER (WHERE ms.is_umpire)::text                           AS umpires,
      COUNT(*) FILTER (WHERE ms.fee_status = 'paid')::text                 AS paid,
      COUNT(*) FILTER (WHERE ms.fee_status = 'partial')::text              AS partial,
      COUNT(*) FILTER (WHERE ms.fee_status = 'unpaid')::text               AS unpaid,
      COUNT(*) FILTER (WHERE ms.fee_status IS NULL)::text                  AS no_fee_record,
      COALESCE(SUM(ms.amount_due),  0)::text                               AS total_due,
      COALESCE(SUM(ms.amount_paid), 0)::text                               AS total_paid,
      COUNT(prev.player_id)::text                                          AS returners,
      (COUNT(*) - COUNT(prev.player_id))::text                             AS new_players
    FROM membership_snapshots ms
    LEFT JOIN membership_snapshots prev
      ON prev.player_id    = ms.player_id
     AND prev.season_year  = ms.season_year - 1
    GROUP BY ms.season_year
    ORDER BY ms.season_year DESC
  `);

  // Team breakdown per year
  const teamResult = await councilQuery<{
    year: number;
    team_name: string;
    count: string;
  }>(`
    SELECT season_year AS year, team_name, COUNT(*)::text AS count
    FROM membership_snapshots
    WHERE team_name IS NOT NULL
    GROUP BY season_year, team_name
    ORDER BY season_year DESC, COUNT(*) DESC
  `);

  // Index team rows by year
  const teamsByYear = new Map<number, { teamName: string; count: number }[]>();
  for (const r of teamResult.rows) {
    const list = teamsByYear.get(r.year) ?? [];
    list.push({ teamName: r.team_name, count: parseInt(r.count, 10) });
    teamsByYear.set(r.year, list);
  }

  return summaryResult.rows.map((r) => ({
    year: r.year,
    total: parseInt(r.total, 10),
    female: parseInt(r.female, 10),
    male: parseInt(r.male, 10),
    rookies: parseInt(r.rookies, 10),
    umpires: parseInt(r.umpires, 10),
    paid: parseInt(r.paid, 10),
    partial: parseInt(r.partial, 10),
    unpaid: parseInt(r.unpaid, 10),
    noFeeRecord: parseInt(r.no_fee_record, 10),
    totalDue: parseFloat(r.total_due),
    totalPaid: parseFloat(r.total_paid),
    returners: parseInt(r.returners, 10),
    newPlayers: parseInt(r.new_players, 10),
    teamBreakdown: teamsByYear.get(r.year) ?? [],
  }));
}

// ─── Meeting Attendance ───────────────────────────────────────────────────────

export type AttendanceStatus = "present" | "absent" | "apologies";

export interface AttendanceRecord {
  userId: string;
  status: AttendanceStatus | null;
}

export async function getMeetingAttendance(meetingId: string): Promise<Map<string, AttendanceStatus | null>> {
  const result = await councilQuery<{ user_id: string; status: string | null }>(
    `SELECT user_id, status FROM meeting_attendees WHERE meeting_id = $1`,
    [meetingId]
  );
  const map = new Map<string, AttendanceStatus | null>();
  for (const row of result.rows) {
    map.set(row.user_id, (row.status as AttendanceStatus) ?? null);
  }
  return map;
}

export async function upsertAttendance(
  meetingId: string,
  userId: string,
  status: AttendanceStatus | null
): Promise<void> {
  if (status === null) {
    await councilQuery(
      `DELETE FROM meeting_attendees WHERE meeting_id = $1 AND user_id = $2`,
      [meetingId, userId]
    );
  } else {
    await councilQuery(
      `INSERT INTO meeting_attendees (meeting_id, user_id, status, attended)
       VALUES ($1, $2, $3, $3 = 'present')
       ON CONFLICT (meeting_id, user_id) DO UPDATE
         SET status = EXCLUDED.status,
             attended = EXCLUDED.attended`,
      [meetingId, userId, status]
    );
  }
}

// ─── Announcements ────────────────────────────────────────────────────────────

export interface AnnouncementRow {
  id: string;
  subject: string;
  body: string;
  recipients: string;
  teamName: string | null;
  sentCount: number;
  failedCount: number;
  sentBy: string;
  sentAt: Date;
}

export async function getAnnouncements(): Promise<AnnouncementRow[]> {
  const result = await councilQuery<{
    id: string; subject: string; body: string; recipients: string;
    team_name: string | null; sent_count: number; failed_count: number;
    sent_by: string; sent_at: Date;
  }>(
    `SELECT id, subject, body, recipients, team_name, sent_count, failed_count, sent_by, sent_at
     FROM council_announcements
     ORDER BY sent_at DESC
     LIMIT 50`
  );
  return result.rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    body: r.body,
    recipients: r.recipients,
    teamName: r.team_name,
    sentCount: r.sent_count,
    failedCount: r.failed_count,
    sentBy: r.sent_by,
    sentAt: r.sent_at,
  }));
}

export async function saveAnnouncement(data: {
  subject: string;
  body: string;
  recipients: string;
  teamId?: string | null;
  teamName?: string | null;
  sentCount: number;
  failedCount: number;
  sentBy: string;
}): Promise<void> {
  await councilQuery(
    `INSERT INTO council_announcements
       (subject, body, recipients, team_id, team_name, sent_count, failed_count, sent_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      data.subject, data.body, data.recipients,
      data.teamId ?? null, data.teamName ?? null,
      data.sentCount, data.failedCount, data.sentBy,
    ]
  );
}
