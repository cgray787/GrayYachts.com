CREATE TABLE IF NOT EXISTS newsletter_issues (
 id TEXT PRIMARY KEY,
 slot TEXT NOT NULL UNIQUE,
 status TEXT NOT NULL DEFAULT 'generating' CHECK(status IN ('generating','pending','published','rejected','failed')),
 title TEXT,
 slug TEXT UNIQUE,
 audience TEXT CHECK(audience IN ('buyer','seller')),
 excerpt TEXT,
 content TEXT,
 original_content TEXT,
 sources TEXT,
 hero TEXT,
 created_at TEXT NOT NULL,
 published_at TEXT,
 reviewed_at TEXT,
 review_feedback TEXT,
 email_sent_at TEXT,
 email_id TEXT,
 lock_until TEXT,
 attempts INTEGER NOT NULL DEFAULT 0,
 error TEXT
);
CREATE INDEX IF NOT EXISTS newsletter_published ON newsletter_issues(status,published_at);
