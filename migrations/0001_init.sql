-- Guests, their invited events, and append-only RSVP history.
-- Events live in config/events.json (not in the DB); slugs are validated in the Worker.

CREATE TABLE guests (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  code            TEXT NOT NULL UNIQUE CHECK (length(code) >= 10),
  name            TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  headcount       INTEGER NOT NULL CHECK (headcount >= 1),
  default_lang    TEXT NOT NULL CHECK (default_lang IN ('en', 'gu')),
  rsvp_status     TEXT CHECK (rsvp_status IN ('yes', 'no')),
  rsvp_updated_at TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE guest_events (
  guest_id   INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_slug TEXT NOT NULL,
  PRIMARY KEY (guest_id, event_slug)
);
CREATE INDEX idx_guest_events_guest_id ON guest_events(guest_id);

CREATE TABLE rsvp_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id   INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('yes', 'no')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_rsvp_log_guest_id ON rsvp_log(guest_id);
