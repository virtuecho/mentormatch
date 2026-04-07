import { describe, expect, it } from "vitest";
import type { DatabaseClient, QueryParams, QueryResult } from "@mentormatch/db";
import type { BookingStatus } from "@mentormatch/shared";
import { AppError } from "@mentormatch/shared";
import {
  cancelBooking,
  completeBooking,
  completeDueAcceptedBookings,
  createBooking,
  createBookingSeries,
  getBookingHistory,
  listBookings,
  respondToBooking,
} from "./index";

type User = {
  id: number;
  email: string;
  fullName: string;
  profileImageUrl: string | null;
};

type Slot = {
  id: number;
  mentorId: number;
  title: string;
  bookingMode: "open" | "preset";
  presetTopic: string | null;
  presetDescription: string | null;
  startTime: string;
  durationMins: number;
  locationType: string;
  city: string;
  address: string;
  maxParticipants: number;
  note: string | null;
  isBooked: number;
  updatedAt: string;
};

type Booking = {
  id: number;
  topic: string;
  description: string | null;
  availabilitySlotId: number;
  createdAt: string;
  updatedAt: string;
  numParticipants: number;
  note: string | null;
  menteeId: number;
  mentorId: number;
  status: BookingStatus;
};

function getSlotEndMs(slot: Slot) {
  return new Date(slot.startTime).getTime() + slot.durationMins * 60_000;
}

function overlaps(left: Slot, right: Slot) {
  const leftStart = new Date(left.startTime).getTime();
  const rightStart = new Date(right.startTime).getTime();
  return leftStart < getSlotEndMs(right) && rightStart < getSlotEndMs(left);
}

class BookingTestDatabase implements DatabaseClient {
  private nextBookingId = 100;

  constructor(
    private readonly users: User[],
    private readonly slots: Slot[],
    private readonly bookings: Booking[] = [],
  ) {
    for (const slot of this.slots) {
      this.syncSlot(slot.id);
    }
  }

  addSlot(slot: Slot) {
    this.slots.push({ ...slot });
    this.syncSlot(slot.id);
  }

  addBooking(booking: Booking) {
    this.bookings.push({ ...booking });
    this.nextBookingId = Math.max(this.nextBookingId, booking.id + 1);
    this.syncSlot(booking.availabilitySlotId);
  }

  async get<T>(sql: string, params: QueryParams = []): Promise<T | null> {
    if (
      sql.includes("FROM availability_slots s") &&
      sql.includes("WHERE s.id = ?")
    ) {
      const slot = this.slots.find((item) => item.id === Number(params[0]));
      if (!slot) {
        return null;
      }

      this.syncSlot(slot.id);

      if (sql.includes("SELECT is_booked FROM availability_slots")) {
        return { is_booked: slot.isBooked } as T;
      }

      return {
        id: slot.id,
        mentor_id: slot.mentorId,
        is_booked: slot.isBooked,
        max_participants: slot.maxParticipants,
        booking_mode: slot.bookingMode,
        preset_topic: slot.presetTopic,
        preset_description: slot.presetDescription,
        start_time: slot.startTime,
        duration_mins: slot.durationMins,
      } as T;
    }

    if (
      sql.includes("FROM availability_slots") &&
      sql.includes("WHERE id = ?")
    ) {
      const slot = this.slots.find((item) => item.id === Number(params[0]));
      if (!slot) {
        return null;
      }

      this.syncSlot(slot.id);

      if (sql.includes("SELECT is_booked FROM availability_slots")) {
        return { is_booked: slot.isBooked } as T;
      }

      return {
        id: slot.id,
        mentor_id: slot.mentorId,
        is_booked: slot.isBooked,
        max_participants: slot.maxParticipants,
        booking_mode: slot.bookingMode,
        preset_topic: slot.presetTopic,
        preset_description: slot.presetDescription,
        start_time: slot.startTime,
        duration_mins: slot.durationMins,
      } as T;
    }

    if (
      sql.includes(
        "SELECT id, mentee_id, mentor_id, availability_slot_id, status",
      )
    ) {
      const booking = this.bookings.find(
        (item) => item.id === Number(params[0]),
      );
      return booking
        ? ({
            id: booking.id,
            mentee_id: booking.menteeId,
            mentor_id: booking.mentorId,
            availability_slot_id: booking.availabilitySlotId,
            status: booking.status,
          } as T)
        : null;
    }

    if (sql.includes("SELECT status FROM bookings WHERE id = ?")) {
      const booking = this.bookings.find(
        (item) => item.id === Number(params[0]),
      );
      return booking ? ({ status: booking.status } as T) : null;
    }

    throw new Error(`Unexpected get query: ${sql}`);
  }

  async all<T>(sql: string, params: QueryParams = []): Promise<T[]> {
    if (sql.includes("SELECT id FROM bookings WHERE mentee_id = ?")) {
      const menteeId = Number(params[0]);
      return this.bookings
        .filter((booking) => booking.menteeId === menteeId)
        .map((booking) => ({ id: booking.id })) as T[];
    }

    if (sql.includes("FROM bookings b") && sql.includes("JOIN profiles p")) {
      const userId = Number(params[0]);
      const filterByMentee = sql.includes("WHERE b.mentee_id = ?");
      const historyMode =
        sql.includes("b.status = 'completed'") &&
        sql.includes("strftime('%s', ?)");
      const now = historyMode
        ? new Date(String(params[1])).getTime()
        : Date.now();

      return this.bookings
        .filter((booking) =>
          filterByMentee
            ? booking.menteeId === userId
            : booking.mentorId === userId,
        )
        .filter((booking) => {
          if (!historyMode) {
            return true;
          }

          const slot = this.slots.find(
            (item) => item.id === booking.availabilitySlotId,
          )!;
          return (
            booking.status === "completed" ||
            (booking.status === "accepted" && getSlotEndMs(slot) <= now)
          );
        })
        .sort((left, right) => {
          const leftSlot = this.slots.find(
            (item) => item.id === left.availabilitySlotId,
          )!;
          const rightSlot = this.slots.find(
            (item) => item.id === right.availabilitySlotId,
          )!;
          return (
            new Date(rightSlot.startTime).getTime() -
              new Date(leftSlot.startTime).getTime() ||
            new Date(right.createdAt).getTime() -
              new Date(left.createdAt).getTime()
          );
        })
        .map((booking) => {
          const slot = this.slots.find(
            (item) => item.id === booking.availabilitySlotId,
          )!;
          const counterpartId = filterByMentee
            ? booking.mentorId
            : booking.menteeId;
          const counterpart = this.users.find(
            (item) => item.id === counterpartId,
          )!;

          return {
            id: booking.id,
            topic: booking.topic,
            description: booking.description,
            note: booking.note,
            num_participants: booking.numParticipants,
            status: booking.status,
            created_at: booking.createdAt,
            updated_at: booking.updatedAt,
            slot_id: slot.id,
            slot_title: slot.title,
            start_time: slot.startTime,
            duration_mins: slot.durationMins,
            location_type: slot.locationType,
            city: slot.city,
            address: slot.address,
            max_participants: slot.maxParticipants,
            booking_mode: slot.bookingMode,
            preset_topic: slot.presetTopic,
            preset_description: slot.presetDescription,
            counterpart_id: counterpart.id,
            counterpart_name: counterpart.fullName,
            counterpart_image: counterpart.profileImageUrl,
            counterpart_email: counterpart.email,
          };
        }) as T[];
    }

    throw new Error(`Unexpected all query: ${sql}`);
  }

  async run(sql: string, params: QueryParams = []): Promise<QueryResult> {
    if (sql.includes("INSERT INTO bookings")) {
      const [
        topic,
        description,
        availabilitySlotId,
        createdAt,
        updatedAt,
        numParticipants,
        note,
        menteeId,
        mentorId,
      ] = params;
      const slotId = Number(availabilitySlotId);

      this.assertActiveBookingAllowed(slotId, Number(menteeId));

      const id = this.nextBookingId++;
      this.bookings.push({
        id,
        topic: String(topic),
        description: description == null ? null : String(description),
        availabilitySlotId: slotId,
        createdAt: String(createdAt),
        updatedAt: String(updatedAt),
        numParticipants: Number(numParticipants),
        note: note == null ? null : String(note),
        menteeId: Number(menteeId),
        mentorId: Number(mentorId),
        status: "pending",
      });
      this.syncSlot(slotId);

      return { changes: 1, lastRowId: id };
    }

    if (
      sql.includes("SET status = 'cancelled', updated_at = ?") &&
      sql.includes("WHERE id = ? AND status IN ('pending', 'accepted')")
    ) {
      const booking = this.bookings.find(
        (item) =>
          item.id === Number(params[1]) &&
          (item.status === "pending" || item.status === "accepted"),
      );

      if (!booking) {
        return { changes: 0, lastRowId: null };
      }

      booking.status = "cancelled";
      booking.updatedAt = String(params[0]);
      this.syncSlot(booking.availabilitySlotId);
      return { changes: 1, lastRowId: null };
    }

    if (
      sql.includes("SET status = 'completed', updated_at = ?") &&
      sql.includes("WHERE id = ? AND mentor_id = ? AND status = 'accepted'")
    ) {
      const booking = this.bookings.find(
        (item) =>
          item.id === Number(params[1]) &&
          item.mentorId === Number(params[2]) &&
          item.status === "accepted",
      );

      if (!booking) {
        return { changes: 0, lastRowId: null };
      }

      booking.status = "completed";
      booking.updatedAt = String(params[0]);
      this.syncSlot(booking.availabilitySlotId);
      return { changes: 1, lastRowId: null };
    }

    if (
      sql.includes("SET status = 'accepted', updated_at = ?") &&
      sql.includes("WHERE id = ? AND mentor_id = ? AND status = 'pending'")
    ) {
      const booking = this.bookings.find(
        (item) =>
          item.id === Number(params[1]) &&
          item.mentorId === Number(params[2]) &&
          item.status === "pending",
      );

      if (!booking) {
        return { changes: 0, lastRowId: null };
      }

      const acceptedSibling = this.bookings.find(
        (item) =>
          item.id !== booking.id &&
          item.availabilitySlotId === booking.availabilitySlotId &&
          item.status === "accepted",
      );

      if (acceptedSibling) {
        throw new Error("slot_already_booked");
      }

      booking.status = "accepted";
      booking.updatedAt = String(params[0]);
      this.syncSlot(booking.availabilitySlotId);
      return { changes: 1, lastRowId: null };
    }

    if (
      sql.includes("SET status = 'cancelled', updated_at = ?") &&
      sql.includes("WHERE availability_slot_id = ?") &&
      sql.includes("AND id != ?")
    ) {
      const slotId = Number(params[1]);
      const excludedId = Number(params[2]);
      let changes = 0;

      for (const booking of this.bookings) {
        if (
          booking.availabilitySlotId === slotId &&
          booking.status === "pending" &&
          booking.id !== excludedId
        ) {
          booking.status = "cancelled";
          booking.updatedAt = String(params[0]);
          changes += 1;
        }
      }

      this.syncSlot(slotId);
      return { changes, lastRowId: null };
    }

    if (
      sql.includes("SET status = 'rejected', updated_at = ?") &&
      sql.includes("WHERE id = ? AND mentor_id = ? AND status = 'pending'")
    ) {
      const booking = this.bookings.find(
        (item) =>
          item.id === Number(params[1]) &&
          item.mentorId === Number(params[2]) &&
          item.status === "pending",
      );

      if (!booking) {
        return { changes: 0, lastRowId: null };
      }

      booking.status = "rejected";
      booking.updatedAt = String(params[0]);
      this.syncSlot(booking.availabilitySlotId);
      return { changes: 1, lastRowId: null };
    }

    if (
      sql.includes("UPDATE bookings") &&
      sql.includes("WHERE status = 'accepted'") &&
      sql.includes("strftime('%s', s.start_time)")
    ) {
      const now = new Date(String(params[1])).getTime();
      let changes = 0;

      for (const booking of this.bookings) {
        const slot = this.slots.find(
          (item) => item.id === booking.availabilitySlotId,
        );
        if (!slot || booking.status !== "accepted") {
          continue;
        }

        if (getSlotEndMs(slot) <= now) {
          booking.status = "completed";
          booking.updatedAt = String(params[0]);
          this.syncSlot(slot.id);
          changes += 1;
        }
      }

      return { changes, lastRowId: null };
    }

    throw new Error(`Unexpected run query: ${sql}`);
  }

  async batch(
    statements: Array<{ sql: string; params?: QueryParams }>,
  ): Promise<QueryResult[]> {
    const bookingSnapshot = this.bookings.map((booking) => ({ ...booking }));
    const slotSnapshot = this.slots.map((slot) => ({ ...slot }));
    const nextBookingId = this.nextBookingId;

    try {
      const results: QueryResult[] = [];
      for (const statement of statements) {
        results.push(await this.run(statement.sql, statement.params ?? []));
      }
      return results;
    } catch (error) {
      this.bookings.splice(0, this.bookings.length, ...bookingSnapshot);
      this.slots.splice(0, this.slots.length, ...slotSnapshot);
      this.nextBookingId = nextBookingId;
      throw error;
    }
  }

  private assertActiveBookingAllowed(slotId: number, menteeId: number) {
    const slot = this.requireSlot(slotId);

    const duplicate = this.bookings.find(
      (booking) =>
        booking.availabilitySlotId === slotId &&
        booking.menteeId === menteeId &&
        (booking.status === "pending" || booking.status === "accepted"),
    );

    if (duplicate) {
      throw new Error(
        "UNIQUE constraint failed: bookings.availability_slot_id, bookings.mentee_id",
      );
    }

    const acceptedOnSlot = this.bookings.find(
      (booking) =>
        booking.availabilitySlotId === slotId && booking.status === "accepted",
    );

    if (acceptedOnSlot) {
      throw new Error("slot_already_booked");
    }

    const overlapping = this.bookings.find((booking) => {
      if (
        booking.menteeId !== menteeId ||
        (booking.status !== "pending" && booking.status !== "accepted")
      ) {
        return false;
      }

      const existingSlot = this.requireSlot(booking.availabilitySlotId);
      return overlaps(existingSlot, slot);
    });

    if (overlapping) {
      throw new Error("booking_time_conflict");
    }
  }

  private requireSlot(slotId: number) {
    const slot = this.slots.find((item) => item.id === slotId);
    if (!slot) {
      throw new Error(`Slot ${slotId} not found`);
    }
    return slot;
  }

  private syncSlot(slotId: number) {
    const slot = this.slots.find((item) => item.id === slotId);
    if (!slot) {
      return;
    }

    slot.isBooked = this.bookings.some(
      (booking) =>
        booking.availabilitySlotId === slotId && booking.status === "accepted",
    )
      ? 1
      : 0;
  }
}

function createBookingTestDatabase() {
  const users: User[] = [
    {
      id: 1,
      email: "mentor@example.com",
      fullName: "Mentor One",
      profileImageUrl: "https://example.com/mentor.png",
    },
    {
      id: 2,
      email: "mentee@example.com",
      fullName: "Mentee One",
      profileImageUrl: "https://example.com/mentee.png",
    },
    {
      id: 3,
      email: "second@example.com",
      fullName: "Mentee Two",
      profileImageUrl: "https://example.com/mentee-two.png",
    },
  ];

  const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
  const slots: Slot[] = [
    {
      id: 10,
      mentorId: 1,
      title: "Career coaching session",
      bookingMode: "open",
      presetTopic: null,
      presetDescription: null,
      startTime: new Date(tomorrow).toISOString(),
      durationMins: 60,
      locationType: "online",
      city: "Remote",
      address: "Video call",
      maxParticipants: 2,
      note: "Bring questions",
      isBooked: 0,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 11,
      mentorId: 1,
      title: "Mock interview",
      bookingMode: "preset",
      presetTopic: "Mock interview debrief",
      presetDescription:
        "We will review your interview answers and next steps.",
      startTime: new Date(tomorrow + 2 * 60 * 60 * 1000).toISOString(),
      durationMins: 60,
      locationType: "online",
      city: "Remote",
      address: "Video call",
      maxParticipants: 1,
      note: null,
      isBooked: 0,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 12,
      mentorId: 1,
      title: "Overlapping session",
      bookingMode: "open",
      presetTopic: null,
      presetDescription: null,
      startTime: new Date(tomorrow + 30 * 60 * 1000).toISOString(),
      durationMins: 60,
      locationType: "online",
      city: "Remote",
      address: "Video call",
      maxParticipants: 1,
      note: null,
      isBooked: 0,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 13,
      mentorId: 1,
      title: "Career coaching session",
      bookingMode: "open",
      presetTopic: null,
      presetDescription: null,
      startTime: new Date(tomorrow + 7 * 24 * 60 * 60 * 1000).toISOString(),
      durationMins: 60,
      locationType: "online",
      city: "Remote",
      address: "Video call",
      maxParticipants: 2,
      note: "Bring questions",
      isBooked: 0,
      updatedAt: new Date().toISOString(),
    },
  ];

  return new BookingTestDatabase(users, slots);
}

describe("feature-bookings", () => {
  it("creates an open booking and lists it for the mentee", async () => {
    const db = createBookingTestDatabase();

    const booking = await createBooking(db, 2, {
      availabilitySlotId: 10,
      topic: "Interview preparation",
      description: "Need help preparing for final rounds",
      numParticipants: 1,
    });

    expect(booking.status).toBe("pending");

    const bookings = await listBookings(db, 2, "mentee");
    expect(bookings).toHaveLength(1);
    expect(bookings[0]).toMatchObject({
      topic: "Interview preparation",
      status: "pending",
      slot: {
        bookingMode: "open",
      },
      counterpart: {
        fullName: "Mentor One",
      },
    });
  });

  it("uses the mentor preset topic and description for preset slots", async () => {
    const db = createBookingTestDatabase();

    await createBooking(db, 2, {
      availabilitySlotId: 11,
      topic: "",
      description: "",
      numParticipants: 1,
    });

    const bookings = await listBookings(db, 2, "mentee");
    expect(bookings[0]).toMatchObject({
      topic: "Mock interview debrief",
      description: "We will review your interview answers and next steps.",
      slot: {
        bookingMode: "preset",
      },
    });
  });

  it("rejects duplicate requests for the same slot", async () => {
    const db = createBookingTestDatabase();

    await createBooking(db, 2, {
      availabilitySlotId: 10,
      topic: "First request",
      numParticipants: 1,
    });

    await expect(
      createBooking(db, 2, {
        availabilitySlotId: 10,
        topic: "Second request",
        numParticipants: 1,
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "duplicate_booking_request",
    });
  });

  it("allows the same mentee to request a slot again after a rejection", async () => {
    const db = createBookingTestDatabase();

    db.addBooking({
      id: 99,
      topic: "First attempt",
      description: null,
      availabilitySlotId: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      numParticipants: 1,
      note: null,
      menteeId: 2,
      mentorId: 1,
      status: "rejected",
    });

    await expect(
      createBooking(db, 2, {
        availabilitySlotId: 10,
        topic: "Second attempt",
        numParticipants: 1,
      }),
    ).resolves.toMatchObject({
      status: "pending",
    });
  });

  it("rejects overlapping active requests for the same mentee", async () => {
    const db = createBookingTestDatabase();

    await createBooking(db, 2, {
      availabilitySlotId: 10,
      topic: "First request",
      numParticipants: 1,
    });

    await expect(
      createBooking(db, 2, {
        availabilitySlotId: 12,
        topic: "Overlapping request",
        numParticipants: 1,
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "booking_time_conflict",
    });
  });

  it("accepts one booking, cancels competing requests, and reopens the slot when cancelled", async () => {
    const db = createBookingTestDatabase();

    const bookingOne = await createBooking(db, 2, {
      availabilitySlotId: 10,
      topic: "Portfolio review",
      numParticipants: 1,
    });
    const bookingTwo = await createBooking(db, 3, {
      availabilitySlotId: 10,
      topic: "Career roadmap",
      numParticipants: 1,
    });

    const accepted = await respondToBooking(db, 1, Number(bookingOne.id), {
      response: "accepted",
    });
    expect(accepted.status).toBe("accepted");

    const mentorBookings = await listBookings(db, 1, "mentor");
    expect(
      mentorBookings.find((booking) => booking.id === bookingOne.id)?.status,
    ).toBe("accepted");
    expect(
      mentorBookings.find((booking) => booking.id === bookingTwo.id)?.status,
    ).toBe("cancelled");

    await expect(
      respondToBooking(db, 1, Number(bookingTwo.id), { response: "accepted" }),
    ).rejects.toBeInstanceOf(AppError);

    await cancelBooking(db, 2, Number(bookingOne.id));

    const slot = await db.get<{ is_booked: number }>(
      "SELECT is_booked FROM availability_slots WHERE id = ? LIMIT 1",
      [10],
    );
    expect(slot?.is_booked).toBe(0);
  });

  it("lets mentors mark accepted sessions as completed early", async () => {
    const db = createBookingTestDatabase();

    const booking = await createBooking(db, 2, {
      availabilitySlotId: 10,
      topic: "Portfolio review",
      numParticipants: 1,
    });

    await respondToBooking(db, 1, Number(booking.id), {
      response: "accepted",
    });

    const result = await completeBooking(db, 1, Number(booking.id));
    expect(result.status).toBe("completed");

    const mentorBookings = await listBookings(db, 1, "mentor");
    expect(
      mentorBookings.find((currentBooking) => currentBooking.id === booking.id)
        ?.status,
    ).toBe("completed");
  });

  it("keeps listBookings as a pure read while showing expired accepted sessions as completed", async () => {
    const db = createBookingTestDatabase();

    db.addSlot({
      id: 40,
      mentorId: 1,
      title: "Past session",
      bookingMode: "open",
      presetTopic: null,
      presetDescription: null,
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      durationMins: 60,
      locationType: "online",
      city: "Remote",
      address: "Video call",
      maxParticipants: 1,
      note: null,
      isBooked: 1,
      updatedAt: new Date().toISOString(),
    });
    db.addBooking({
      id: 70,
      topic: "Past booking",
      description: null,
      availabilitySlotId: 40,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      numParticipants: 1,
      note: null,
      menteeId: 2,
      mentorId: 1,
      status: "accepted",
    });

    const mentorBookings = await listBookings(db, 1, "mentor");
    expect(mentorBookings.find((booking) => booking.id === 70)?.status).toBe(
      "completed",
    );

    const stored = await db.get<{ status: string }>(
      "SELECT status FROM bookings WHERE id = ? LIMIT 1",
      [70],
    );
    expect(stored?.status).toBe("accepted");
  });

  it("moves due accepted sessions to completed when the explicit completion job runs", async () => {
    const db = createBookingTestDatabase();

    db.addSlot({
      id: 50,
      mentorId: 1,
      title: "Past session",
      bookingMode: "open",
      presetTopic: null,
      presetDescription: null,
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      durationMins: 60,
      locationType: "online",
      city: "Remote",
      address: "Video call",
      maxParticipants: 1,
      note: null,
      isBooked: 1,
      updatedAt: new Date().toISOString(),
    });
    db.addBooking({
      id: 80,
      topic: "Past booking",
      description: null,
      availabilitySlotId: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      numParticipants: 1,
      note: null,
      menteeId: 2,
      mentorId: 1,
      status: "accepted",
    });

    const result = await completeDueAcceptedBookings(db);
    expect(result.count).toBe(1);

    const stored = await db.get<{ status: string }>(
      "SELECT status FROM bookings WHERE id = ? LIMIT 1",
      [80],
    );
    expect(stored?.status).toBe("completed");
  });

  it("rejects over-capacity requests", async () => {
    const db = createBookingTestDatabase();

    await expect(
      createBooking(db, 2, {
        availabilitySlotId: 10,
        topic: "Team session",
        numParticipants: 3,
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: "participants_exceeded",
    });
  });

  it("creates a recurring booking pack across multiple selected slots", async () => {
    const db = createBookingTestDatabase();

    const result = await createBookingSeries(db, 2, {
      availabilitySlotIds: [10, 13],
      topic: "Career growth plan",
      description: "Want continuity across multiple weekly sessions",
      numParticipants: 1,
    });

    expect(result.count).toBe(2);

    const bookings = await listBookings(db, 2, "mentee");
    expect(bookings).toHaveLength(2);
    expect(bookings.map((booking) => booking.slot.id)).toEqual([13, 10]);
    expect(
      bookings.every((booking) => booking.topic === "Career growth plan"),
    ).toBe(true);
  });

  it("rolls back the whole booking pack when one occurrence violates a rule", async () => {
    const db = createBookingTestDatabase();

    await expect(
      createBookingSeries(db, 2, {
        availabilitySlotIds: [10, 12],
        topic: "Conflicting pack",
        numParticipants: 1,
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "booking_time_conflict",
    });

    const stored = await db.all<{ id: number }>(
      "SELECT id FROM bookings WHERE mentee_id = ?",
      [2],
    );
    expect(stored).toHaveLength(0);
  });

  it("returns booking history without loading active requests first", async () => {
    const db = createBookingTestDatabase();

    db.addSlot({
      id: 60,
      mentorId: 1,
      title: "Future accepted",
      bookingMode: "open",
      presetTopic: null,
      presetDescription: null,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      durationMins: 60,
      locationType: "online",
      city: "Remote",
      address: "Video call",
      maxParticipants: 1,
      note: null,
      isBooked: 1,
      updatedAt: new Date().toISOString(),
    });
    db.addSlot({
      id: 61,
      mentorId: 1,
      title: "Past accepted",
      bookingMode: "open",
      presetTopic: null,
      presetDescription: null,
      startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      durationMins: 60,
      locationType: "online",
      city: "Remote",
      address: "Video call",
      maxParticipants: 1,
      note: null,
      isBooked: 1,
      updatedAt: new Date().toISOString(),
    });
    db.addBooking({
      id: 90,
      topic: "Future active",
      description: null,
      availabilitySlotId: 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      numParticipants: 1,
      note: null,
      menteeId: 2,
      mentorId: 1,
      status: "accepted",
    });
    db.addBooking({
      id: 91,
      topic: "Past completed",
      description: null,
      availabilitySlotId: 61,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      numParticipants: 1,
      note: null,
      menteeId: 2,
      mentorId: 1,
      status: "accepted",
    });

    const history = await getBookingHistory(db, 2, "mentee");
    expect(history.map((booking) => booking.id)).toEqual([91]);
    expect(history[0]?.status).toBe("completed");
  });

  it("requires at least one selected slot for a booking pack", async () => {
    const db = createBookingTestDatabase();

    await expect(
      createBookingSeries(db, 2, {
        availabilitySlotIds: [],
        topic: "Career growth plan",
        description: "Want continuity across multiple weekly sessions",
        numParticipants: 1,
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: "slot_selection_required",
    });
  });
});
