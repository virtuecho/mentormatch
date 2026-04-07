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
  adminMentorRequestListSchema,
  adminSlotListSchema,
  adminUserListSchema,
  AppError,
  mentorRequestReviewSchema,
  type PaginatedResult,
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

type AdminUserRecord = Awaited<ReturnType<typeof listUsersForAdmin>>[number];
type AdminMentorRequestRecord = Awaited<
  ReturnType<typeof listMentorRequests>
>[number];
type AdminSlotRecord = Awaited<
  ReturnType<typeof listAllAvailabilitySlots>
>[number];

function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    total,
    page: currentPage,
    pageSize,
    totalPages,
  };
}

function getAdminUserBucket(user: AdminUserRecord) {
  if (user.role === "admin") {
    return "admin" as const;
  }

  return user.isMentorApproved ? ("mentor" as const) : ("mentee" as const);
}

function getAdminUserBucketRank(bucket: ReturnType<typeof getAdminUserBucket>) {
  switch (bucket) {
    case "admin":
      return 0;
    case "mentor":
      return 1;
    default:
      return 2;
  }
}

function buildAdminUserSummary(users: AdminUserRecord[]) {
  return {
    totalUsers: users.length,
    admins: users.filter((user) => getAdminUserBucket(user) === "admin").length,
    mentors: users.filter((user) => getAdminUserBucket(user) === "mentor")
      .length,
    members: users.filter((user) => getAdminUserBucket(user) === "mentee")
      .length,
  };
}

function getRequestStatusRank(status: RequestStatus) {
  switch (status) {
    case "pending":
      return 0;
    case "approved":
      return 1;
    case "rejected":
      return 2;
    case "withdrawn":
      return 3;
    default:
      return 4;
  }
}

function buildMentorRequestSummary(requests: AdminMentorRequestRecord[]) {
  return {
    totalRequests: requests.length,
    pending: requests.filter((request) => request.status === "pending").length,
    approved: requests.filter((request) => request.status === "approved")
      .length,
    rejected: requests.filter((request) => request.status === "rejected")
      .length,
    withdrawn: requests.filter((request) => request.status === "withdrawn")
      .length,
  };
}

function buildSlotSummary(slots: AdminSlotRecord[]) {
  return {
    totalSlots: slots.length,
    open: slots.filter((slot) => !slot.isBooked).length,
    booked: slots.filter((slot) => slot.isBooked).length,
  };
}

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

export async function listAdminUsers(db: DatabaseClient, input: unknown = {}) {
  const filters = adminUserListSchema.parse(input);
  const users = await listUsersForAdmin(db);
  const summary = buildAdminUserSummary(users);
  const normalizedQuery = filters.q.toLowerCase();

  const filtered = users
    .filter((user) =>
      filters.role === "all" ? true : getAdminUserBucket(user) === filters.role,
    )
    .filter((user) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        user.fullName,
        user.email,
        user.location ?? "",
        user.position,
        user.company,
        ...user.mentorSkills,
        ...user.expertise,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });

  filtered.sort((left, right) => {
    switch (filters.sort) {
      case "name_asc":
        return (
          left.fullName.localeCompare(right.fullName) || left.id - right.id
        );
      case "name_desc":
        return (
          right.fullName.localeCompare(left.fullName) || right.id - left.id
        );
      case "newest":
        return right.createdAt.localeCompare(left.createdAt) || right.id - left.id;
      default: {
        const roleComparison =
          getAdminUserBucketRank(getAdminUserBucket(left)) -
            getAdminUserBucketRank(getAdminUserBucket(right)) ||
          left.fullName.localeCompare(right.fullName);
        return roleComparison || left.id - right.id;
      }
    }
  });

  const page = paginateItems(filtered, filters.page, filters.pageSize);

  return {
    ...page,
    filters,
    summary: {
      ...summary,
      matchingUsers: filtered.length,
    },
  };
}

export async function listAdminMentorRequests(
  db: DatabaseClient,
  input: unknown = {},
) {
  const filters = adminMentorRequestListSchema.parse(input);
  const requests = await listMentorRequests(db);
  const summary = buildMentorRequestSummary(requests);
  const normalizedQuery = filters.q.toLowerCase();

  const filtered = requests
    .filter((request) =>
      filters.status === "all" ? true : request.status === filters.status,
    )
    .filter((request) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        request.user.fullName,
        request.user.email,
        request.note ?? "",
        request.documentUrl ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });

  filtered.sort((left, right) => {
    switch (filters.sort) {
      case "submitted_asc":
        return left.submittedAt.localeCompare(right.submittedAt);
      case "submitted_desc":
        return right.submittedAt.localeCompare(left.submittedAt);
      default: {
        const statusComparison =
          getRequestStatusRank(left.status) -
          getRequestStatusRank(right.status);
        return (
          statusComparison ||
          right.submittedAt.localeCompare(left.submittedAt) ||
          right.id - left.id
        );
      }
    }
  });

  const page = paginateItems(filtered, filters.page, filters.pageSize);

  return {
    ...page,
    filters,
    summary: {
      ...summary,
      matchingRequests: filtered.length,
    },
  };
}

export async function listAdminAvailabilitySlots(
  db: DatabaseClient,
  input: unknown = {},
) {
  const filters = adminSlotListSchema.parse(input);
  const slots = await listAllAvailabilitySlots(db, {
    mentorId: filters.mentorId ?? null,
  });
  const summary = buildSlotSummary(slots);
  const normalizedQuery = filters.q.toLowerCase();

  const filtered = slots
    .filter((slot) => {
      switch (filters.status) {
        case "booked":
          return slot.isBooked;
        case "open":
          return !slot.isBooked;
        default:
          return true;
      }
    })
    .filter((slot) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        slot.title ?? "",
        slot.city,
        slot.address,
        slot.note ?? "",
        slot.presetTopic ?? "",
        slot.mentor.fullName,
        slot.mentor.email,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });

  filtered.sort((left, right) =>
    filters.sort === "start_desc"
      ? right.startTime.localeCompare(left.startTime)
      : left.startTime.localeCompare(right.startTime),
  );

  const page = paginateItems(filtered, filters.page, filters.pageSize);

  return {
    ...page,
    filters,
    summary: {
      ...summary,
      matchingSlots: filtered.length,
    },
  };
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
