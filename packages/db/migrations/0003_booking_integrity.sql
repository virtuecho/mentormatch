CREATE UNIQUE INDEX IF NOT EXISTS idx_slots_mentor_start_unique
ON availability_slots(mentor_id, start_time);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_request_unique
ON bookings(availability_slot_id, mentee_id)
WHERE status IN ('pending', 'accepted');

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_accepted_slot_unique
ON bookings(availability_slot_id)
WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_bookings_slot_status
ON bookings(availability_slot_id, status);

CREATE TRIGGER IF NOT EXISTS trg_bookings_prevent_active_insert_on_booked_slot
BEFORE INSERT ON bookings
WHEN NEW.status IN ('pending', 'accepted')
  AND EXISTS (
    SELECT 1
    FROM bookings existing
    WHERE existing.availability_slot_id = NEW.availability_slot_id
      AND existing.status = 'accepted'
  )
BEGIN
  SELECT RAISE(ABORT, 'slot_already_booked');
END;

CREATE TRIGGER IF NOT EXISTS trg_bookings_prevent_active_update_on_booked_slot
BEFORE UPDATE OF status, availability_slot_id ON bookings
WHEN NEW.status IN ('pending', 'accepted')
  AND EXISTS (
    SELECT 1
    FROM bookings existing
    WHERE existing.availability_slot_id = NEW.availability_slot_id
      AND existing.status = 'accepted'
      AND existing.id != NEW.id
  )
BEGIN
  SELECT RAISE(ABORT, 'slot_already_booked');
END;

CREATE TRIGGER IF NOT EXISTS trg_bookings_prevent_overlapping_active_insert
BEFORE INSERT ON bookings
WHEN NEW.status IN ('pending', 'accepted')
  AND EXISTS (
    SELECT 1
    FROM bookings existing
    JOIN availability_slots existing_slot
      ON existing_slot.id = existing.availability_slot_id
    JOIN availability_slots new_slot
      ON new_slot.id = NEW.availability_slot_id
    WHERE existing.mentee_id = NEW.mentee_id
      AND existing.status IN ('pending', 'accepted')
      AND existing.id != NEW.id
      AND strftime('%s', existing_slot.start_time)
        < strftime('%s', new_slot.start_time) + (new_slot.duration_mins * 60)
      AND strftime('%s', new_slot.start_time)
        < strftime('%s', existing_slot.start_time) + (existing_slot.duration_mins * 60)
  )
BEGIN
  SELECT RAISE(ABORT, 'booking_time_conflict');
END;

CREATE TRIGGER IF NOT EXISTS trg_bookings_prevent_overlapping_active_update
BEFORE UPDATE OF status, availability_slot_id, mentee_id ON bookings
WHEN NEW.status IN ('pending', 'accepted')
  AND EXISTS (
    SELECT 1
    FROM bookings existing
    JOIN availability_slots existing_slot
      ON existing_slot.id = existing.availability_slot_id
    JOIN availability_slots new_slot
      ON new_slot.id = NEW.availability_slot_id
    WHERE existing.mentee_id = NEW.mentee_id
      AND existing.status IN ('pending', 'accepted')
      AND existing.id != NEW.id
      AND strftime('%s', existing_slot.start_time)
        < strftime('%s', new_slot.start_time) + (new_slot.duration_mins * 60)
      AND strftime('%s', new_slot.start_time)
        < strftime('%s', existing_slot.start_time) + (existing_slot.duration_mins * 60)
  )
BEGIN
  SELECT RAISE(ABORT, 'booking_time_conflict');
END;

CREATE TRIGGER IF NOT EXISTS trg_bookings_sync_slot_state_after_insert
AFTER INSERT ON bookings
BEGIN
  UPDATE availability_slots
  SET
    is_booked = CASE
      WHEN EXISTS (
        SELECT 1
        FROM bookings
        WHERE availability_slot_id = NEW.availability_slot_id
          AND status = 'accepted'
      ) THEN 1
      ELSE 0
    END,
    updated_at = datetime('now')
  WHERE id = NEW.availability_slot_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_bookings_sync_slot_state_after_update
AFTER UPDATE OF status, availability_slot_id ON bookings
BEGIN
  UPDATE availability_slots
  SET
    is_booked = CASE
      WHEN EXISTS (
        SELECT 1
        FROM bookings
        WHERE availability_slot_id = OLD.availability_slot_id
          AND status = 'accepted'
      ) THEN 1
      ELSE 0
    END,
    updated_at = datetime('now')
  WHERE id = OLD.availability_slot_id;

  UPDATE availability_slots
  SET
    is_booked = CASE
      WHEN EXISTS (
        SELECT 1
        FROM bookings
        WHERE availability_slot_id = NEW.availability_slot_id
          AND status = 'accepted'
      ) THEN 1
      ELSE 0
    END,
    updated_at = datetime('now')
  WHERE id = NEW.availability_slot_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_bookings_sync_slot_state_after_delete
AFTER DELETE ON bookings
BEGIN
  UPDATE availability_slots
  SET
    is_booked = CASE
      WHEN EXISTS (
        SELECT 1
        FROM bookings
        WHERE availability_slot_id = OLD.availability_slot_id
          AND status = 'accepted'
      ) THEN 1
      ELSE 0
    END,
    updated_at = datetime('now')
  WHERE id = OLD.availability_slot_id;
END;

UPDATE availability_slots
SET is_booked = CASE
  WHEN EXISTS (
    SELECT 1
    FROM bookings
    WHERE availability_slot_id = availability_slots.id
      AND status = 'accepted'
  ) THEN 1
  ELSE 0
END;
