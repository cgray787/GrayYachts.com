CREATE TABLE IF NOT EXISTS campaign_recipients (
 token TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
 prospect_id TEXT NOT NULL DEFAULT '', campaign TEXT NOT NULL, is_test INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS campaign_events (
 id TEXT PRIMARY KEY, token TEXT NOT NULL REFERENCES campaign_recipients(token),
 kind TEXT NOT NULL CHECK(kind IN ('open','click','call_requested','booking_confirmed')),
 link TEXT NOT NULL DEFAULT '', suspected_automation INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS campaign_events_recipient_time ON campaign_events(token,created_at);
CREATE TABLE IF NOT EXISTS campaign_call_requests (
 id TEXT PRIMARY KEY, token TEXT NOT NULL REFERENCES campaign_recipients(token),
 name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
 preferred_time TEXT NOT NULL, timezone TEXT NOT NULL, message TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','confirmed')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
