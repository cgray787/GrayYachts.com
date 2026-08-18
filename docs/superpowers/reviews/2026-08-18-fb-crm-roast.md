# FB CRM — roast council findings

Convened 2026-08-15/18 against the FB CRM plan (spec `2026-08-15-fb-crm-design.md`).
Five personas; two returned before a session limit killed the rest — the missing
three (Logician, Researcher, Buyer) were re-run afterwards. Saved verbatim
because both completed reports change how the pipeline should be run, whatever
the final verdict says.

---

## The Contrarian (red team) — score 3/10

**Stance:** the channel is already disproven by the 100%-failure sample, the
commission structure would freeze listings out of the co-broke network that
actually sells yachts, and the CRM is the thing being built to avoid noticing
both.

1. **5% total commission means no buyer's broker ever shows the boat.**
   Brokerage runs at 10% split 5/5. At 5% total a co-broking buyer's agent gets
   2.5% — $5,000 on the median $200K board boat for a survey, sea trial,
   haul-out and six-month escrow. Nobody takes it. Boats over $150K sell through
   the co-broke network; the structure opts out of the distribution system.
   Every listing won under it risks expiring unsold and burning the relationship.

2. **"Seller nets their full ask" only holds at 100% of an inflated price.**
   Brokered boats in this band close 8–12% under ask; any negotiation discount
   comes entirely out of the seller and the first-conversation promise breaks.
   The Leopard 44 is already flagged ~30% over market — the product would add
   5% to that. Also: commission taken off the *old* ask leaves money on the
   table, a sign the structure was reverse-engineered from a nice sentence.

3. **Adverse selection, stated by our own data.** 6 of the 8 highest-value leads
   confirmed broker-represented (4 by comp research, 2 by reply). 100% of leads
   that have actually spoken to us. Marketplace above $150K is a reach channel
   brokers buy, not FSBO inventory. The `fsbo` heuristic has 0% verified
   precision on every tested case. What remains after removing brokered boats
   is largely sellers who refuse brokers or whose boats no broker would take.

4. **Half the board is unservicable, the rest small.** 97 leads = 52 AK, 34 WA,
   11 OR. A Seattle solo operator cannot show/survey/sea-trial Alaska boats.
   Strike AK → 45 boats, median $200K; only 2 over $1M (both already brokered).
   Realistic per-deal take after co-broke and house splits: ~$2.5–3K on a
   6–9-month cycle — worse than the opportunity cost of the JBY day-job book.

5. **The CRM is the tell; the extension is a loaded gun.** 8 leads in motion is
   a spreadsheet, not a cadence engine. And Messenger scraping + ~12 cold
   DMs/day from the personal profile that also runs the Gray Yachts Meta ads is
   a textbook spam signature: the fastest death is one restriction taking out
   the scraper, the DMs and the ad account together.

**Must hear:** the experiment already returned a clean negative and the response
was to build tooling instead of reading the result. If continuing: stop
building, send 30 more openers via the existing sheet, pre-register a
threshold — fewer than 3 confirmed private sellers = the channel is dead. And
fix the commission to 10% total / 5% co-broke first.

---

## The Expansionist (bull) — score 8/10

**Stance:** the lead-gen isn't failing — it's succeeding at generating the wrong
asset class, and the machine is worth 10–50x what it's currently pointed at.

1. **"Already brokered" is the most valuable dataset produced, filed as
   failure.** A boat simultaneously on YachtWorld and hand-posted to Marketplace
   is a seller who doesn't believe his broker is working — the warmest listing
   lead in the industry. Re-fire `broker_dead` at day 120/210 ("your agreement's
   probably up — here's what I'd do differently") instead of killing it. Also:
   the brokered set is a co-broke rolodex — the buyer side of those boats pays
   half commission with zero listing work.

2. **Seller-side only, on a free 97-boat inventory catalog.** Publish the sweep
   as "PNW & Alaska boats not on YachtWorld," capture buyer emails, co-broke
   into the brokered half. One 33 ProFish sold buyer-side ≈ $16K without any
   FSBO saying yes.

3. **The 5%/5% structure is the product — stop whispering it 5 DMs at a time.**
   It neutralises the #1 FSBO objection with arithmetic. Put it on a landing
   page behind a Meta ad (kit already exists). Outbound DMs cap at ~12/day with
   ban risk on every send; inbound has no cap and arrives pre-sold. The DM
   channel is a test harness for the ad copy, not the business.

4. **Geography and recency are free constraints.** Ketchikan/Whittier are the
   thinnest markets in North America; FL/Chesapeake/Great Lakes/SoCal are
   10–50x denser and JBY co-broke isn't PNW-bound. And re-sweeping weekly to
   pitch day-0–3 listings is a different business from pitching six-month-stale
   posts — recency is the highest-leverage filter and costs nothing.

5. **The engine is asset-agnostic.** Sweep → filter → comp → queue → cadence
   works for AFH/RCF care homes, seattle-biz-listings, charter ops. Same code,
   four pipelines. Follow Up Boss will never have the sourcing layer — that's
   the moat, not the CRM UI.

**Must hear:** treat it as a marine market intelligence layer, not a
listing-acquisition tool. Zero live conversations after 5 DMs is a sample of
five, drawn from the thinnest geography and stalest inventory through the most
rate-limited channel. Widen any one of the three and the numbers change.

---

## Where both agree (the actionable overlap)

Even before the remaining three verdicts, the two opposed reports converge on:

1. **The current commission structure needs rework** — bull treats 5%/5% as ad
   copy, red team shows it breaks at close. Reconcile before the terms message
   is ever sent again.
2. **Stop expanding the DM channel from the personal account** — both flag the
   ban blast radius (ads + scraper + pipeline on one identity).
3. **The brokered boats are data, not dead weight** — expired-listing re-fire
   and/or co-broke, rather than `broker_dead` forever.
4. **Recency beats volume** — pitch fresh listings, not months-stale ones.
