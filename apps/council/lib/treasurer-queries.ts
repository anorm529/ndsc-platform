import "server-only";

import { councilQuery } from "@/db/council-db";

// ─── Club Accounts ────────────────────────────────────────────────────────────

export interface ClubAccount {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  balance: number;
  createdAt: Date;
}

export async function getAllAccounts(): Promise<ClubAccount[]> {
  const result = await councilQuery<{
    id: string; name: string; description: string | null;
    is_active: boolean; balance: string; created_at: Date;
  }>(
    `SELECT a.id, a.name, a.description, a.is_active, a.created_at,
            COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0)::text AS balance
     FROM club_accounts a
     LEFT JOIN account_transactions t ON t.account_id = a.id
     GROUP BY a.id, a.name, a.description, a.is_active, a.created_at
     ORDER BY a.is_active DESC, a.name ASC`
  );

  return result.rows.map((r) => ({
    id: r.id, name: r.name, description: r.description,
    isActive: r.is_active, balance: parseFloat(r.balance), createdAt: r.created_at,
  }));
}

export async function getAccountById(id: string): Promise<ClubAccount | null> {
  const result = await councilQuery<{
    id: string; name: string; description: string | null;
    is_active: boolean; balance: string; created_at: Date;
  }>(
    `SELECT a.id, a.name, a.description, a.is_active, a.created_at,
            COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0)::text AS balance
     FROM club_accounts a
     LEFT JOIN account_transactions t ON t.account_id = a.id
     WHERE a.id = $1
     GROUP BY a.id, a.name, a.description, a.is_active, a.created_at`,
    [id]
  );
  if (!result.rows[0]) return null;
  const r = result.rows[0];
  return {
    id: r.id, name: r.name, description: r.description,
    isActive: r.is_active, balance: parseFloat(r.balance), createdAt: r.created_at,
  };
}

export interface Transaction {
  id: string;
  accountId: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  date: string;
  reference: string | null;
  recordedBy: string;
  createdAt: Date;
}

export async function getAccountTransactions(accountId: string): Promise<Transaction[]> {
  const result = await councilQuery<{
    id: string; account_id: string; type: string; category: string;
    amount: string; description: string; date: string;
    reference: string | null; recorded_by: string; created_at: Date;
  }>(
    `SELECT id, account_id, type, category, amount::text, description,
            date::text, reference, recorded_by, created_at
     FROM account_transactions
     WHERE account_id = $1
     ORDER BY date DESC, created_at DESC`,
    [accountId]
  );

  return result.rows.map((r) => ({
    id: r.id, accountId: r.account_id, type: r.type as Transaction["type"],
    category: r.category, amount: parseFloat(r.amount),
    description: r.description, date: r.date,
    reference: r.reference, recordedBy: r.recorded_by, createdAt: r.created_at,
  }));
}

export async function createAccount(data: {
  name: string;
  description?: string;
  recordedBy: string;
}): Promise<string> {
  const result = await councilQuery<{ id: string }>(
    `INSERT INTO club_accounts (name, description) VALUES ($1, $2) RETURNING id`,
    [data.name, data.description ?? null]
  );
  return result.rows[0]!.id;
}

export async function addTransaction(data: {
  accountId: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  date: string;
  reference?: string;
  recordedBy: string;
}): Promise<string> {
  const result = await councilQuery<{ id: string }>(
    `INSERT INTO account_transactions
       (account_id, type, category, amount, description, date, reference, recorded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      data.accountId, data.type, data.category, data.amount,
      data.description, data.date, data.reference ?? null, data.recordedBy,
    ]
  );
  return result.rows[0]!.id;
}

export async function deleteTransaction(id: string): Promise<void> {
  await councilQuery(`DELETE FROM account_transactions WHERE id = $1`, [id]);
}

// ─── Fee Seasons ──────────────────────────────────────────────────────────────

export interface FeeSeason {
  id: string;
  year: number;
  label: string;
  playerFee: number;
  rookieFee: number;
  umpireFee: number;
  dueDate: string | null;
  isActive: boolean;
  createdAt: Date;
}

export async function getAllFeeSeasons(): Promise<FeeSeason[]> {
  const result = await councilQuery<{
    id: string; year: number; label: string;
    standard_fee: string; rookie_fee: string; umpire_fee: string;
    due_date: string | null; is_active: boolean; created_at: Date;
  }>(
    `SELECT id, year, label, standard_fee::text, rookie_fee::text, umpire_fee::text,
            due_date::text, is_active, created_at
     FROM fee_seasons ORDER BY year DESC`
  );

  return result.rows.map((r) => ({
    id: r.id, year: r.year, label: r.label,
    playerFee: parseFloat(r.standard_fee),
    rookieFee: parseFloat(r.rookie_fee),
    umpireFee: parseFloat(r.umpire_fee),
    dueDate: r.due_date, isActive: r.is_active, createdAt: r.created_at,
  }));
}

export async function getFeeSeasonById(id: string): Promise<FeeSeason | null> {
  const result = await councilQuery<{
    id: string; year: number; label: string;
    standard_fee: string; rookie_fee: string; umpire_fee: string;
    due_date: string | null; is_active: boolean; created_at: Date;
  }>(
    `SELECT id, year, label, standard_fee::text, rookie_fee::text, umpire_fee::text,
            due_date::text, is_active, created_at
     FROM fee_seasons WHERE id = $1`,
    [id]
  );
  if (!result.rows[0]) return null;
  const r = result.rows[0];
  return {
    id: r.id, year: r.year, label: r.label,
    playerFee: parseFloat(r.standard_fee),
    rookieFee: parseFloat(r.rookie_fee),
    umpireFee: parseFloat(r.umpire_fee),
    dueDate: r.due_date, isActive: r.is_active, createdAt: r.created_at,
  };
}

// ─── Player Fees ──────────────────────────────────────────────────────────────

export type FeeType = "player" | "rookie" | "umpire" | "custom";

export interface PlayerFeeRow {
  id: string;
  playerId: string;
  userId: string | null;
  playerName: string;
  teamId: string | null;
  teamName: string | null;
  seasonId: string;
  feeType: FeeType;
  amountDue: number;
  amountPaid: number;
  notes: string | null;
}

export async function getPlayerFeesForSeason(seasonId: string): Promise<PlayerFeeRow[]> {
  const result = await councilQuery<{
    id: string; player_id: string; user_id: string | null; player_name: string;
    team_id: string | null; team_name: string | null;
    season_id: string; fee_type: string; amount_due: string; amount_paid: string; notes: string | null;
  }>(
    `SELECT pf.id, pf.player_id, pf.user_id, pf.player_name, pf.team_id, ct.name AS team_name,
            pf.season_id, pf.fee_type, pf.amount_due::text,
            COALESCE(SUM(fp.amount), 0)::text AS amount_paid,
            pf.notes
     FROM player_fees pf
     LEFT JOIN council_teams ct ON ct.id = pf.team_id
     LEFT JOIN fee_payments fp ON fp.player_fee_id = pf.id
     WHERE pf.season_id = $1
     GROUP BY pf.id, pf.player_id, pf.user_id, pf.player_name, pf.team_id, ct.name, pf.season_id, pf.fee_type, pf.amount_due, pf.notes
     ORDER BY ct.name ASC NULLS LAST, pf.player_name ASC`,
    [seasonId]
  );

  return result.rows.map((r) => ({
    id: r.id, playerId: r.player_id, userId: r.user_id, playerName: r.player_name,
    teamId: r.team_id, teamName: r.team_name,
    seasonId: r.season_id, feeType: r.fee_type as FeeType,
    amountDue: parseFloat(r.amount_due),
    amountPaid: parseFloat(r.amount_paid), notes: r.notes,
  }));
}

export interface FeePayment {
  id: string;
  playerFeeId: string;
  amount: number;
  paymentMethod: string;
  paidAt: Date;
  reference: string | null;
  notes: string | null;
  recordedBy: string;
  createdAt: Date;
}

export async function getPaymentsForFee(playerFeeId: string): Promise<FeePayment[]> {
  const result = await councilQuery<{
    id: string; player_fee_id: string; amount: string; payment_method: string;
    paid_at: Date; reference: string | null; notes: string | null;
    recorded_by: string; created_at: Date;
  }>(
    `SELECT id, player_fee_id, amount::text, payment_method, paid_at,
            reference, notes, recorded_by, created_at
     FROM fee_payments WHERE player_fee_id = $1 ORDER BY paid_at DESC`,
    [playerFeeId]
  );

  return result.rows.map((r) => ({
    id: r.id, playerFeeId: r.player_fee_id, amount: parseFloat(r.amount),
    paymentMethod: r.payment_method, paidAt: r.paid_at,
    reference: r.reference, notes: r.notes,
    recordedBy: r.recorded_by, createdAt: r.created_at,
  }));
}

export async function upsertPlayerFee(data: {
  playerId: string;
  userId?: string | null;
  playerName: string;
  teamId?: string;
  seasonId: string;
  feeType: FeeType;
  amountDue: number;
  notes?: string;
}): Promise<string> {
  const result = await councilQuery<{ id: string }>(
    `INSERT INTO player_fees (player_id, user_id, player_name, team_id, season_id, fee_type, amount_due, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (player_id, season_id) DO UPDATE
       SET user_id     = EXCLUDED.user_id,
           player_name = EXCLUDED.player_name,
           team_id     = EXCLUDED.team_id,
           fee_type    = EXCLUDED.fee_type,
           amount_due  = EXCLUDED.amount_due,
           notes       = EXCLUDED.notes,
           updated_at  = NOW()
     RETURNING id`,
    [
      data.playerId, data.userId ?? null, data.playerName, data.teamId ?? null,
      data.seasonId, data.feeType, data.amountDue, data.notes ?? null,
    ]
  );
  return result.rows[0]!.id;
}

export async function deletePlayerFee(id: string): Promise<void> {
  await councilQuery(`DELETE FROM player_fees WHERE id = $1`, [id]);
}

export async function recordFeePayment(data: {
  playerFeeId: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
  reference?: string;
  notes?: string;
  recordedBy: string;
}): Promise<void> {
  await councilQuery(
    `INSERT INTO fee_payments
       (player_fee_id, amount, payment_method, paid_at, reference, notes, recorded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      data.playerFeeId, data.amount, data.paymentMethod,
      data.paidAt, data.reference ?? null, data.notes ?? null, data.recordedBy,
    ]
  );
}

export async function deleteFeePayment(id: string): Promise<void> {
  await councilQuery(`DELETE FROM fee_payments WHERE id = $1`, [id]);
}

export async function createFeeSeason(data: {
  year: number;
  label: string;
  playerFee: number;
  rookieFee: number;
  umpireFee: number;
  dueDate?: string;
}): Promise<string> {
  const result = await councilQuery<{ id: string }>(
    `INSERT INTO fee_seasons (year, label, standard_fee, rookie_fee, umpire_fee, due_date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [data.year, data.label, data.playerFee, data.rookieFee, data.umpireFee, data.dueDate ?? null]
  );
  return result.rows[0]!.id;
}

export async function updateFeeSeason(id: string, data: {
  label: string;
  playerFee: number;
  rookieFee: number;
  umpireFee: number;
  dueDate?: string;
}): Promise<void> {
  await councilQuery(
    `UPDATE fee_seasons SET label = $1, standard_fee = $2, rookie_fee = $3, umpire_fee = $4,
            due_date = $5 WHERE id = $6`,
    [data.label, data.playerFee, data.rookieFee, data.umpireFee, data.dueDate ?? null, id]
  );
}
