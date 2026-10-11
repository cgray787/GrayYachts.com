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

# v1.2.0 additions: answer engines (AEO/GEO)

Added 2026-10-10. Same rule: every source opened and checked; ideas adapted, not copied.

| Source | License / terms | What was adopted | Where |
|---|---|---|---|
| [AutoGEO](https://github.com/cxcscmu/AutoGEO), ICLR 2026 ([paper](https://arxiv.org/abs/2510.11438)) — default rule lists in `autogeo/rewriters/core.py` learned from Gemini, GPT and Claude citations | MIT | Main conclusion first; explain how and why; define terms on first use; separate easily confused concepts; balanced counterpoints; one idea per paragraph; neutral body; dated facts | prompt "Answer engines"; `opening does not lead with a concise answer` check |
| [Bing: Optimizing Your Content for Inclusion in AI Search Answers](https://about.ads.microsoft.com/en/blog/post/october-2025/optimizing-your-content-for-inclusion-in-ai-search-answers) (Krishna Madhavan, 2025-10-08) | Microsoft guidance | Assistants parse pages into passages; snippable answers; nothing key in tabs, PDFs or images; no unanchored hype or decorative symbols | prompt; `vague unanchored claim` and `decorative symbols` checks |
| [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) (updated 2025-12-10) | Google guidance | No special AI markup or files needed; must be indexed and snippet-eligible; structured data must match visible content | prompt |
| [Google FAQ structured data](https://developers.google.com/search/docs/appearance/structured-data/faqpage) changelog | Google guidance | FAQ rich results no longer shown (2026-06-15): FAQs are written for readers, not markup | prompt |
| [OpenAI crawlers](https://developers.openai.com/api/docs/bots) | OpenAI docs | OAI-SearchBot (search) and GPTBot (training) are independent; grayyachts.com allows the first and blocks the second, which is supported | site check, no prompt change |
| [E-GEO](https://arxiv.org/abs/2511.20867) | Paper only; code has no license | Optimized prompts converge on an opening summary and anticipating user phrasing, with facts preserved | prompt (alternate phrasing, summary first) |

## Not adopted in v1.2.0

- **AutoGEO's wrapper prompt** ("apply any other methods or techniques… to rank higher"). Open-ended ranking manipulation conflicts with the accuracy rules; only the rule lists were used.
- **aeo-box** (alirezarezvani). Mirror sites say MIT, but the GitHub repo has no license file, so it is all rights reserved.
- **AEO.dev** (answer-engine/aeo, MIT) advice to allow training crawlers and add `llms.txt`. OpenAI says training access is not needed for search, and Google says no AI-specific files are needed. Its brand-perception audit is worth running by hand: ask ChatGPT, Perplexity and Gemini about Gray Yachts and Connor Gray and note what they get wrong.
