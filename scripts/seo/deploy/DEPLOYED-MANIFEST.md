# VPS deployment manifest: SEO editorial agent

Recorded Wed Nov 11, 2026 ~8:55 AM PST, read-only, from VPS 45.132.242.109.

`/opt/grayyachts-seo` on the VPS is not a git checkout. Every file under its `scripts/` and `content/`
matched this branch (`seo/international-editorial-20260924` at 0b76995) byte for byte (sha256 below).
The installed systemd unit and timer match `scripts/seo/deploy/`. The only deployed file that was not
in git is the systemd drop-in, mirrored here verbatim as
`deploy/grayyachts-seo-editorial.service.d/claude-oauth-write.conf`
(installed at `/etc/systemd/system/grayyachts-seo-editorial.service.d/`).

Not mirrored (private, outside the repo): `/opt/grayyachts-automation/private/seo.env` (variable names only:
GRAYYACHTS_SEO_PROVIDER=hermes, GRAYYACHTS_SEO_STATE, RESEND_API_KEY, GRAYYACHTS_SEO_RESEARCH_MODE=official_sources)
and `valuation-providers.env`. No secret values are recorded here.

```
b709a48e7f9a273168b87e7817185ae5aab903e4485a2d13a20f9adfb80bcb0a  /opt/grayyachts-seo/content/seo/article-images.json
3b346346653a246f87028196f6d1fa21005cdd7af7e78ed8c8744711ef73da36  /opt/grayyachts-seo/content/seo/articles.json
48af8c60f0679629efd17093393a1f8770a6ee2b0419a69dc500faa4a3f6a48f  /opt/grayyachts-seo/content/seo/brand-images.json
8e83e0497041d0cf8480fd7d6e1eb76875bfd2d123ede8d65f8900653973e3fd  /opt/grayyachts-seo/content/seo/brands.json
da654ef8eb69f57c0c030a873ff22d11e60b01408596369d7dbd39b899a17719  /opt/grayyachts-seo/content/seo/keywords.json
372dcb3937170c1ce909ebe1639d4843f3e9ffc72134a01218d3c98b1c7382f0  /opt/grayyachts-seo/content/seo/program.json
da998e1314e107da284f748c5a1775ff891f02b5a960c148754a26322eea8973  /opt/grayyachts-seo/content/seo/show-images.json
bb4221e69521d15ee21452f7ff803a35c8a6dc11801177d9a5e1356bda24db9c  /opt/grayyachts-seo/content/seo/shows.json
32dae3052f331ee34d628ef535709b301259a45df7c7522c4d35dcf49873f00b  /opt/grayyachts-seo/scripts/seo/.gitignore
1da290be1a1a3066a029ba48d6012f90e1b8545f29b0960d1dd0d116033bbb91  /opt/grayyachts-seo/scripts/seo/PROMPT-SOURCES.md
dbad99f8aaddde57762f073288d7dcbb1e52ac2154630ee5b4fb7345a8282357  /opt/grayyachts-seo/scripts/seo/deploy/grayyachts-seo-editorial.service
1ed25be3099bd938a4531c5bb66693b307f63fd980db81b255b9772b290deaae  /opt/grayyachts-seo/scripts/seo/deploy/grayyachts-seo-editorial.timer
3a1b38251d1809382ea8642260bd205c6949a353a973811dd4f12433284dfc59  /opt/grayyachts-seo/scripts/seo/editorial_loop.py
62b14b988b9d32414c4d1f836e55b74387aaa32b10e8aa418e43786eaa9d4762  /opt/grayyachts-seo/scripts/seo/public_sources.py
17e95bb92a983ca25f470db69bbc2430ba4d445cf0e9e772674a5e51a5a95b97  /opt/grayyachts-seo/scripts/seo/research-prompt.md
a8d9e7a7cb4d22c66becdee656ce33ab53e1c54cbafb98954436b3eef7d3971d  /opt/grayyachts-seo/scripts/seo/test_editorial_loop.py
3e84a549dfc06a23114fb18d47d583e9d8e4afe295f49ee3ca3315b599f07ec7  /opt/grayyachts-seo/scripts/seo/test_reliability.py
23ca39ea2bca177fc428d6e57f8940f04ffee11bae01755b5f66fd47b93c1081  /etc/systemd/system/grayyachts-seo-editorial.service.d/claude-oauth-write.conf
```
