-- Hard rule (Connor, 2026-11-11): every newsletter edition and insights article uses only
-- never-before-used images, including at least one of Connor's own photos (kind 'owner') and at
-- least one freshly imported licensed photo or AI illustration (kind 'licensed' or 'generated');
-- the lead image is never AI-generated. The rule itself is enforced in application code
-- (src/lib/newsletter/images.ts checkFreshMix); this migration adds the storage it needs:
-- Connor's private photo library, and the insights side of the never-reuse ledger, so a newsletter
-- edition can never claim a photo an insights article already used, and vice versa.
CREATE TABLE newsletter_owner_photos (
 id TEXT PRIMARY KEY,           -- sha256 hex of the processed JPEG bytes
 r2_key TEXT NOT NULL,          -- 'owner-photos/<id>.jpg' in the YACHT_PHOTOS bucket
 phash TEXT NOT NULL,           -- 64-bit dHash, 16 hex characters, for near-duplicate detection
 width INTEGER,
 height INTEGER,
 taken_on TEXT,                 -- date only (YYYY-MM-DD); no time or location is kept
 description TEXT,              -- best-effort AI caption; null if generation failed
 tags TEXT NOT NULL DEFAULT '[]',
 approved INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL
);
CREATE INDEX newsletter_owner_photos_phash ON newsletter_owner_photos(phash);

-- The insights side of the never-reuse ledger (newsletter_image_uses is the newsletter side).
CREATE TABLE insights_image_uses (
 image_id TEXT PRIMARY KEY,
 article_slug TEXT NOT NULL,
 used_at TEXT NOT NULL
);

DROP TRIGGER newsletter_reserve_images;
CREATE TRIGGER newsletter_reserve_images AFTER UPDATE OF images ON newsletter_issues
WHEN NEW.images <> OLD.images
BEGIN
 SELECT RAISE(ABORT,'Newsletter images cannot be replaced') WHERE json_array_length(OLD.images)>0 AND NEW.status NOT IN ('pending','published');
 SELECT RAISE(ABORT,'Newsletter needs 2-9 images') WHERE json_array_length(NEW.images) NOT BETWEEN 2 AND 9;
 SELECT RAISE(ABORT,'Newsletter image was already used in another edition')
  WHERE EXISTS (SELECT 1 FROM json_each(NEW.images) j JOIN newsletter_image_uses u ON u.image_id=json_extract(j.value,'$.id') WHERE u.issue_id<>NEW.id);
 SELECT RAISE(ABORT,'Newsletter image was already used on an insights article')
  WHERE EXISTS (SELECT 1 FROM json_each(NEW.images) j JOIN insights_image_uses i ON i.image_id=json_extract(j.value,'$.id'));
 INSERT OR IGNORE INTO newsletter_image_uses(image_id,issue_id,used_at)
 SELECT json_extract(value,'$.id'),NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM json_each(NEW.images);
END;
