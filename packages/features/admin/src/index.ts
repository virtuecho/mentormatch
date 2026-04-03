import type { BatchStatement, DatabaseClient } from "@mentormatch/db";
import { listAllAvailabilitySlots } from "@mentormatch/feature-availability";
import {
  buildProfileUpdateStatements,
  getProfile,
  listMentorRequests,
  listUsersForAdmin,
  parseProfileUpdateInput,
} from "@mentormatch/feature-profile";
import {
  AppError,
  mentorRequestReviewSchema,
  type RequestStatus,
  type UserRole,
} from "@mentormatch/shared";

export type AdminActor = {
  id: number;
  requestId?: string | null;
};

type AuditAction =
  | "admin.profile.updated"
  | "admin.mentor_request.reviewed"
  | "admin.mentor.approved"
  | "admin.mentor.revoked"
  | "admin.slot.deleted";

type TargetType = "user" | "mentor_request" | "availability_slot";

function buildAuditStatement(input: {
  actor: AdminActor;
  action: AuditAction;
  targetType: TargetType;
  targetId: number;
  metadata?: Record<string, unknown>;
  now: string;
}): BatchStatement {
  return {
    sql: `
      INSERT INTO audit_logs (
        actor_user_id, action, target_type, target_id, request_id, metadata_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    params: [
      input.actor.id,
      input.action,
      input.targetType,
      input.targetId,
      input.actor.requestId ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.now,
    ],
  };
}

export async function listAdminUsers(db: DatabaseClient) {
  return listUsersForAdmin(db);
}

export async function listAdminMentorRequests(db: DatabaseClient) {
  return listMentorRequests(db);
}

export async function listAdminAvailabilitySlots(
  db: DatabaseClient,
  input: { mentorId?: number | null } = {},
) {
  return listAllAvailabilitySlots(db, input);
}

export async function reviewMentorRequestAsAdmin(
  db: DatabaseClient,
  actor: AdminActor,
  requestId: number,
  input: unknown,
) {
  const payload = mentorRequestReviewSchema.parse(input);
  const request = await db.get<{
    id: number;
    user_id: number;
    status: RequestStatus;
  }>(
    `
      SELECT r.id, r.user_id, r.status
      FROM mentor_requests r
      WHERE r.id = ?
      LIMIT 1
    `,
    [requestId],
  );

  if (!request) {
    throw new AppError(
      404,
      "mentor_request_not_found",
      "Verification request not found",
    );
  }

  if (request.status !== "pending") {
    throw new AppError(
      409,
      "mentor_request_already_reviewed",
      "This verification request has already been reviewed",
    );
  }

  const now = new Date().toISOString();
  const [requestUpdate] = await db.batch([
    {
      sql: "UPDATE mentor_requests SET status = ?, reviewed_at = ? WHERE id = ? AND status = 'pending'",
      params: [payload.status, now, requestId],
    },
    {
      sql: "UPDATE users SET role = ?, is_mentor_approved = ?, updated_at = ? WHERE id = ?",
      params: [
        payload.status === "approved" ? "mentor" : "mentee",
        payload.status === "approved" ? 1 : 0,
        now,
        request.user_id,
      ],
    },
    buildAuditStatement({
      actor,
      action: "admin.mentor_request.reviewed",
      targetType: "mentor_request",
      targetId: requestId,
      metadata: {
        decision: payload.status,
        userId: request.user_id,
      },
      now,
    }),
  ]);

  if (requestUpdate?.changes !== 1) {
    throw new AppError(
      409,
      "mentor_request_already_reviewed",
      "This verification request has already been reviewed",
    );
  }

  return {
    status: payload.status,
  };
}

async function getUserForMentorModeration(db: DatabaseClient, userId: number) {
  const current = await db.get<{ role: UserRole; is_mentor_approved: number }>(
    "SELECT role, is_mentor_approved FROM users WHERE id = ? LIMIT 1",
    [userId],
  );

  if (!current) {
    throw new AppError(404, "user_not_found", "User not found");
  }

  if (current.role === "admin") {
    throw new AppError(
      403,
      "admin_role_locked",
      "Admin accounts cannot be changed through mentor moderation",
    );
  }

  return current;
}

export async function approveMentorAsAdmin(
  db: DatabaseClient,
  actor: AdminActor,
  userId: number,
) {
  const current = await getUserForMentorModeration(db, userId);

  if (current.role === "mentor" && current.is_mentor_approved) {
    throw new AppError(
      409,
      "mentor_already_active",
      "This user is already an approved mentor.",
    );
  }

  const now = new Date().toISOString();
  const [userUpdate] = await db.batch([
    {
      sql: "UPDATE users SET role = ?, is_mentor_approved = ?, updated_at = ? WHERE id = ?",
      params: ["mentor", 1, now, userId],
    },
    {
      sql: "UPDATE mentor_requests SET status = ?, reviewed_at = ? WHERE user_id = ? AND status = ?",
      params: ["approved", now, userId, "pending"],
    },
    buildAuditStatement({
      actor,
      action: "admin.mentor.approved",
      targetType: "user",
      targetId: userId,
      metadata: {
        previousRole: current.role,
        previousIsMentorApproved: Boolean(current.is_mentor_approved),
      },
      now,
    }),
  ]);

  if (userUpdate?.changes !== 1) {
    throw new AppError(404, "user_not_found", "User not found");
  }

  return { ok: true };
}

export async function updateUserProfileAsAdmin(
  db: DatabaseClient,
  actor: AdminActor,
  userId: number,
  input: unknown,
) {
  const current = await db.get<{ id: number }>(
    "SELECT id FROM users WHERE id = ? LIMIT 1",
    [userId],
  );

  if (!current) {
    throw new AppError(404, "user_not_found", "User not found");
  }

  const payload = parseProfileUpdateInput(input);
  const now = new Date().toISOString();
  await db.batch([
    ...buildProfileUpdateStatements(userId, payload, now),
    buildAuditStatement({
      actor,
      action: "admin.profile.updated",
      targetType: "user",
      targetId: userId,
      metadata: {
        changedFields: [
          "fullName",
          "bio",
          "location",
          "profileImageUrl",
          "linkedinUrl",
          "instagramUrl",
          "facebookUrl",
          "websiteUrl",
          "phone",
          "mentorSkills",
          "educations",
          "experiences",
        ],
      },
      now,
    }),
  ]);

  return getProfile(db, userId);
}

export async function revokeMentorAsAdmin(
  db: DatabaseClient,
  actor: AdminActor,
  userId: number,
) {
  const current = await getUserForMentorModeration(db, userId);

  if (current.role !== "mentor" || !current.is_mentor_approved) {
    throw new AppError(
      409,
      "mentor_not_active",
      "This user is not currently an approved mentor.",
    );
  }

  const now = new Date().toISOString();
  const upcoming = await db.get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM availability_slots WHERE mentor_id = ? AND start_time >= ?",
    [userId, now],
  );

  const [userUpdate] = await db.batch([
    {
      sql: "UPDATE users SET role = ?, is_mentor_approved = ?, updated_at = ? WHERE id = ?",
      params: ["mentee", 0, now, userId],
    },
    {
      sql: "DELETE FROM availability_slots WHERE mentor_id = ? AND start_time >= ?",
      params: [userId, now],
    },
    buildAuditStatement({
      actor,
      action: "admin.mentor.revoked",
      targetType: "user",
      targetId: userId,
      metadata: {
        removedUpcomingSlots: Number(upcoming?.count ?? 0),
      },
      now,
    }),
  ]);

  if (userUpdate?.changes !== 1) {
    throw new AppError(404, "user_not_found", "User not found");
  }

  return { ok: true, removedUpcomingSlots: Number(upcoming?.count ?? 0) };
}

export async function deleteAvailabilitySlotAsAdmin(
  db: DatabaseClient,
  actor: AdminActor,
  slotId: number,
) {
  const slot = await db.get<{
    id: number;
    mentor_id: number;
    start_time: string;
  }>(
    "SELECT id, mentor_id, start_time FROM availability_slots WHERE id = ? LIMIT 1",
    [slotId],
  );

  if (!slot) {
    throw new AppError(
      404,
      "availability_not_found",
      "Availability slot not found",
    );
  }

  const now = new Date().toISOString();
  const [deleteResult] = await db.batch([
    {
      sql: "DELETE FROM availability_slots WHERE id = ?",
      params: [slotId],
    },
    buildAuditStatement({
      actor,
      action: "admin.slot.deleted",
      targetType: "availability_slot",
      targetId: slotId,
      metadata: {
        mentorId: slot.mentor_id,
        startTime: slot.start_time,
      },
      now,
    }),
  ]);

  if (deleteResult?.changes !== 1) {
    throw new AppError(
      404,
      "availability_not_found",
      "Availability slot not found",
    );
  }

  return { ok: true };
}
