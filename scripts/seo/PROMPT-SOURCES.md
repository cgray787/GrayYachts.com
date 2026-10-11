# Sources behind research-prompt.md v1.1.0

Upgraded 2026-10-10. Every source below was opened and checked that day. Ideas were adapted and paraphrased into the house rules; no third-party prompt text is copied verbatim.

| Source | License / terms | What was adopted | Where |
|---|---|---|---|
| [Google: Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) (updated 2026-10-05) | Google guidance | Pre-return self-check questions; Who/How/Why → AI-assistance note on the page; no writing to word counts; no date-only "freshness" edits | prompt "Before returning"; `howThisWasMade()` in `src/lib/editorial.ts`; refresh rules |
| [GEO: Generative Engine Optimization](https://arxiv.org/abs/2311.09735), KDD 2024 | arXiv | Quotations, attributed statistics and cited sources raised AI-answer visibility most; keyword stuffing lowered it; gains were largest for lower-ranked sites | prompt "Writing answers that can be quoted" |
| [GEO: How to Dominate AI Search](https://arxiv.org/abs/2509.08919) (found via awesome-geo) | arXiv | AI search favors earned (third-party) media over brand-owned content | prompt "Earned media"; `earnedMediaIdeas` output |
| [aaron-he-zhu/aaron-marketing-skills](https://github.com/aaron-he-zhu/aaron-marketing-skills) v20.1.0 `content-writer`, `geo-content-optimizer`, `content-gap-analysis`, `content-quality-auditor`; frozen [seo-geo-claude-skills v9.9.12](https://github.com/aaron-he-zhu/seo-geo-claude-skills/tree/v9.9.12) `content-refresher`, `internal-linking-optimizer`, `meta-tags-optimizer` | Apache-2.0 | Refresh mode and republish-date thresholds (<20% keep date, 20–50% last updated, >50% new date); answer-first sections; measured/estimated/unknown labels; gaps must name evidence; seller-journey stages; descriptive internal-link anchors; title/description length guidance; material-connection disclosure (CORE-EEAT T04); stock-phrasing check | prompt; `revisionProposal`, `internalLinks`, `disclosures`, `intent` in the output schema; `validate_article()` |
| [zubair-trabzada/geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude) `geo-citability`, `geo-content` | MIT | Rubric *structure* only: self-contained passages, named-subject sentences, what counts as a sourced statistic, signs of low-quality AI prose | prompt; stock-phrase regex |
| [Anavem SEO content brief prompts](https://www.anavem.com/prompts/seo-content-brief-prompts) | "All rights reserved"; ideas only | Create / update / merge / do-not-publish decision; intent with evidence; never invent volume, difficulty, rankings or gaps | prompt "Choosing what to write" |
| [Collective Brain content refresh brief](https://collectivebrain.de/en/ai-prompts/content-refresh-briefing/) | Terms not stated; ideas only | Refresh brief shape: outdated content, gaps, prioritized changes | prompt "Refreshing an existing article" |
| [luka2chat/awesome-geo](https://github.com/luka2chat/awesome-geo) | CC0 | Index only; led to the earned-media study above | — |

## Deliberately not adopted

- **geo-seo-claude's "Reference Data" numbers.** It credits the GEO study with a 134–167-word ideal passage and a 115% quotation gain from "IIT Delhi". Neither appears that way in the study: 115% is the *cite sources* result for the fifth-ranked site. The 134–167 figure cites an analysis that could not be traced. Its examples also use unsourced statistics, which this agent forbids.
- **Fixed quotas** (FAQ answers of 40–60 words, exactly N internal links, statistic density targets). Google warns against writing to counts and the house rules ban arbitrary quotas, so these became guidance.
- **First-hand experience signals** ("when I tested this…"). Recommended by several sources, but the agent has no first-hand experience and must not claim any.
- **Tools needing keys or live rank data** (Tavily probes, IndexNow pushes, rank trackers). The agent runs with WebSearch and WebFetch only, and Search Console data is not yet connected.
