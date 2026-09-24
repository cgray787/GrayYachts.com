# Consistent editorial section layout

Connor identified the visual jump between Newsletter and Featured Brands. All five section landing pages now use the shared EditorialHero: identical top padding, tab placement, container width, heading treatment, photo overlay and action placement. The four former dark section bodies now follow the Newsletter's ivory palette with readable muted text and warm gold links. Existing article detail layouts are preserved.

Images reuse existing local assets: newsletter and Connor use the brokerage yacht hero, brands use the overhead motor-yacht photo, guides use Seawulff, and shows use the credited 2022 Monaco archival photograph. The show hero links its source and CC BY-SA license and labels display cropping/shading; it does not claim to depict the current show.

Validation: TypeScript and targeted ESLint passed; image files fully decoded; guarded deployment preserved all 16 fleet pages and passed editorial-photo preflight. All five live section pages returned 200 with the shared hero, ivory content and responding hero photos. Safari visual checks covered local Brands and Owner Guides and the deployed Boat Shows header.

Cloudflare version: cd780cea-ed10-471c-b17c-c1cda5319926.
