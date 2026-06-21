import "server-only";

import { councilQuery } from "@/db/council-db";

export async function createMeeting(data: {
  title: string;
  type: string;
  scheduledAt: string;
  location?: string;
  agenda?: string;
  createdBy: string;
}): Promise<string> {
  const result = await councilQuery<{ id: string }>(
    `INSERT INTO council_meetings (title, type, scheduled_at, location, agenda, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      data.title, data.type, data.scheduledAt,
      data.location ?? null, data.agenda ?? null, data.createdBy,
    ]
  );
  return result.rows[0]!.id;
}

export async function updateMeeting(
  id: string,
  data: {
    title?: string;
    type?: string;
    scheduledAt?: string;
    location?: string;
    agenda?: string;
    minutes?: string;
    status?: string;
  }
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { values.push(data.title); sets.push(`title = $${values.length}`); }
  if (data.type !== undefined) { values.push(data.type); sets.push(`type = $${values.length}`); }
  if (data.scheduledAt !== undefined) { values.push(data.scheduledAt); sets.push(`scheduled_at = $${values.length}`); }
  if (data.location !== undefined) { values.push(data.location || null); sets.push(`location = $${values.length}`); }
  if (data.agenda !== undefined) { values.push(data.agenda || null); sets.push(`agenda = $${values.length}`); }
  if (data.minutes !== undefined) { values.push(data.minutes || null); sets.push(`minutes = $${values.length}`); }
  if (data.status !== undefined) { values.push(data.status); sets.push(`status = $${values.length}`); }

  if (sets.length === 0) return;

  sets.push(`updated_at = NOW()`);
  values.push(id);
  await councilQuery(
    `UPDATE council_meetings SET ${sets.join(", ")} WHERE id = $${values.length}`,
    values
  );
}

export async function getMeetingActions(meetingId: string) {
  const result = await councilQuery<{
    id: string; assigned_to: string | null; title: string;
    description: string | null; due_date: string | null;
    status: string; priority: string; created_by: string; created_at: Date;
  }>(
    `SELECT id, assigned_to, title, description, due_date::text, status, priority, created_by, created_at
     FROM action_items WHERE meeting_id = $1
     ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, due_date ASC NULLS LAST`,
    [meetingId]
  );
  return result.rows;
}

export async function createActionItem(data: {
  meetingId?: string;
  assignedTo?: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: string;
  createdBy: string;
}): Promise<string> {
  const result = await councilQuery<{ id: string }>(
    `INSERT INTO action_items (meeting_id, assigned_to, title, description, due_date, priority, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      data.meetingId ?? null,
      data.assignedTo ?? null,
      data.title,
      data.description ?? null,
      data.dueDate ?? null,
      data.priority ?? "medium",
      data.createdBy,
    ]
  );
  return result.rows[0]!.id;
}

export async function createActionItemsForAll(
  memberIds: string[],
  data: Omit<Parameters<typeof createActionItem>[0], "assignedTo">
): Promise<void> {
  await Promise.all(
    memberIds.map((memberId) => createActionItem({ ...data, assignedTo: memberId }))
  );
}

export async function updateActionStatus(id: string, status: string): Promise<void> {
  await councilQuery(
    `UPDATE action_items SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, id]
  );
}
