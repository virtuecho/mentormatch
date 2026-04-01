ALTER TABLE availability_slots ADD COLUMN booking_mode TEXT NOT NULL DEFAULT 'open';
ALTER TABLE availability_slots ADD COLUMN preset_topic TEXT;
ALTER TABLE availability_slots ADD COLUMN preset_description TEXT;
