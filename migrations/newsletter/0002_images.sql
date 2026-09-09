ALTER TABLE newsletter_issues ADD COLUMN images TEXT NOT NULL DEFAULT '[]';
ALTER TABLE newsletter_issues ADD COLUMN review_revision INTEGER NOT NULL DEFAULT 0;
CREATE TABLE newsletter_image_uses (
 image_id TEXT PRIMARY KEY,
 issue_id TEXT NOT NULL REFERENCES newsletter_issues(id),
 used_at TEXT NOT NULL
);
-- Reserving all selected images and storing the draft is one atomic statement.
-- A repeated image, within this issue or any earlier one, rolls it all back.
CREATE TRIGGER newsletter_reserve_images AFTER UPDATE OF images ON newsletter_issues
WHEN NEW.images <> OLD.images
BEGIN
 SELECT RAISE(ABORT,'Newsletter images cannot be replaced') WHERE json_array_length(OLD.images)>0;
 SELECT RAISE(ABORT,'Newsletter needs 2-3 images') WHERE json_array_length(NEW.images) NOT BETWEEN 2 AND 3;
 INSERT INTO newsletter_image_uses(image_id,issue_id,used_at)
 SELECT json_extract(value,'$.id'),NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM json_each(NEW.images);
END;
