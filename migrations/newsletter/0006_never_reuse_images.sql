-- Hard rule (Connor, 2026-10-30): never use the same picture twice. Until now, replacing an
-- edition's photos deleted its reservations, so a corrected edition's photos went back into the
-- pool: 2026-10-24 led with kingfisher-3225/01.jpg, released when the 2026-10-18 edition was
-- corrected. A reservation is now permanent. Re-saving an edition with a photo it already holds is
-- allowed; a photo reserved by any other edition aborts the whole update.
DROP TRIGGER newsletter_reserve_images;
CREATE TRIGGER newsletter_reserve_images AFTER UPDATE OF images ON newsletter_issues
WHEN NEW.images <> OLD.images
BEGIN
 SELECT RAISE(ABORT,'Newsletter images cannot be replaced') WHERE json_array_length(OLD.images)>0 AND NEW.status NOT IN ('pending','published');
 SELECT RAISE(ABORT,'Newsletter needs 2-9 images') WHERE json_array_length(NEW.images) NOT BETWEEN 2 AND 9;
 SELECT RAISE(ABORT,'Newsletter image was already used in another edition')
  WHERE EXISTS (SELECT 1 FROM json_each(NEW.images) j JOIN newsletter_image_uses u ON u.image_id=json_extract(j.value,'$.id') WHERE u.issue_id<>NEW.id);
 INSERT OR IGNORE INTO newsletter_image_uses(image_id,issue_id,used_at)
 SELECT json_extract(value,'$.id'),NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM json_each(NEW.images);
END;
