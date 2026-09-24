# Editorial photo completeness

User requested a working picture on every post/card, sourcing and checking all images while retaining the approved style.

Initial live audit: 20 editorial pages (five section landing pages, eight Insights articles, seven newsletter posts), 62 distinct image URLs including logos; no broken HTTP/image-type responses. Five brand cards were original SVG text graphics, not photographs. Replaced them with licensed contextual photographs, with visible captions explicitly distinguishing them from manufacturer model photographs. No dealer-photo permission was assumed. An optional question about JBY rights remains unanswered.

New photos:
- Boat wake by Ali Waheed: https://www.pexels.com/photo/boat-wake-on-open-water-under-clear-blue-sky-35117143/
- Fishing reel by Kevyn Costa: https://www.pexels.com/photo/fishing-rod-by-the-sea-at-sunset-34092100/
- Barcelona 2011 show by Jordiferrer, CC BY-SA 3.0: https://commons.wikimedia.org/wiki/File:Sal%C3%B3_N%C3%A0utic_Internacional_de_Barcelona_2011_-_01.JPG

Three other cards reuse reviewed Pexels nautical detail photos with their original credits. No image was modified to imply ownership or to fabricate a manufacturer model. Pexels permits website/newsletter use and modifications: https://www.pexels.com/license/. Sources and license metadata are stored in content/seo/brand-images.json, show-images.json and docs/newsletter-licensed-images.json. New catalog entries use byte hashes; the old Barcelona file/catalog entry is retained to preserve immutable historical references.

Wally's archive image is 400×600 portrait. Kept its verified actual Wally photograph, displayed contained at approximately 215×323 CSS pixels in a desktop card rather than stretched across its width. The 460×310 Barcelona photograph was replaced with a 1280×960 archive photo; the 2011 date remains visible. Rejected an unrelated large tourist catamaran as a brand image.

Added scripts/check-editorial-images.mjs:
- predeploy verifies complete mappings for every brand, show and published article;
- requires photographic formats, nonempty alt text and reasonable source dimensions;
- fully decodes pixels to catch corrupt data;
- --live crawls public newsletter posts and Insights routes, downloads and decodes every public editorial photo and rejects SVG placeholders.

Local verification: 14 brand + 31 show + eight published article photographs decoded, TypeScript and diff checks passed. Guarded deploy protects all 16 existing yacht listings. Production result recorded after deployment below.

Production deployment: b9f91134-445c-4d77-9de1-1c30af92b40e. Post-deploy audit passed: 19 photo-bearing public pages including seven newsletter posts, 60 distinct image URLs downloaded and fully decoded; no SVG placeholder photos, missing sources, blank alt text or HTTP failures. Login and portal regression smoke checks passed. Safari confirmed the live replacement card photo, caption, source and license within the retained navy/gold style. All 14 brand cards are photographic; five remain explicitly contextual, not model depictions.
