-- Expand new photo sets for illustrated sections; existing editions stay immutable.
DROP TRIGGER newsletter_reserve_images;
CREATE TRIGGER newsletter_reserve_images AFTER UPDATE OF images ON newsletter_issues
WHEN NEW.images <> OLD.images
BEGIN
 SELECT RAISE(ABORT,'Newsletter images cannot be replaced') WHERE json_array_length(OLD.images)>0;
 SELECT RAISE(ABORT,'Newsletter needs 2-9 images') WHERE json_array_length(NEW.images) NOT BETWEEN 2 AND 9;
 INSERT INTO newsletter_image_uses(image_id,issue_id,used_at)
 SELECT json_extract(value,'$.id'),NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM json_each(NEW.images);
END;
