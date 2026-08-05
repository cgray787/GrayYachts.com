# Collecting real testimonials for grayyachts.com

The homepage testimonial section is built and live-ready, but
`src/lib/testimonials.ts` ships **empty on purpose** — the section renders
nothing until real quotes are added, so the site never displays invented
social proof.

Fabricated reviews are also an FTC violation (16 CFR Part 465, effective
2024) carrying civil penalties per violation. And Connor's buyers know
these boats and these owners personally.

## Who to ask

Twelve real clients from 2026 listings and service work. Asking all twelve
should comfortably return the 5–6 needed.

| Client | Connection | Best angle |
|---|---|---|
| Ed Houghton | Quicksilver 675 trade-in — **closed** | Smoothest ask; deal completed July 2026 |
| Winston Cordes | Cobalt 293 *Dub Sea* | Listed and marketed |
| David Eckols | Hunter Passage 42 *Playa Linda* | Full listing + survey coordination |
| Stefan Palanciuc | Yamaha 252SE | Listing + photography |
| Tyeson Doughty | Cobalt 343 | Listing signed July 2026 |
| Brian White | Back Cove 30 *Miss Maggie II* | Listing + photo shoot |
| Charlie Brown | Sea Ray 350 *Sau Ping* | Took the listing over from another broker |
| Cathy Hayes | Rozema 50 *Jimmie* | $1.1M commercial listing |
| Mark Hayes | Jeanneau NC 695 | Net listing |
| Spark Carlander | Ocean Alexander 548 | Contract addendum handled same-day |
| Teagan Wrest | Axopar 28 service | Warranty + haul-out coordination |
| Andrew Shuman | Axopar service | Work order coordination |

## The ask (email)

> Subject: Quick favour — one or two lines?
>
> Hi {First},
>
> Hope you're enjoying the {boat}. I'm putting together a new Gray Yachts
> site and I'd love to include a short note from the owners I've worked
> with this year.
>
> No pressure at all — just one or two lines about how the process went
> would mean a lot. Anything honest is genuinely more useful to me than
> anything polished.
>
> If you're happy for me to use it, let me know how you'd like to be
> credited — full name, or just first name and last initial. I'll include
> your boat unless you'd rather I didn't.
>
> Thanks either way,
> Connor
> Gray Yachts · 425-671-8474

## The ask (text — better response rate)

> Hey {First} — quick favour. Building out the new Gray Yachts site and
> I'd love a line or two from you about how the {boat} process went. Even
> one sentence helps. Totally fine to say no. Also let me know how you'd
> like your name shown if you're good with it. Thanks! — Connor

## Then

Paste each verbatim into `src/lib/testimonials.ts`:

```ts
export const testimonials: Testimonial[] = [
  {
    quote: "…exactly what they sent you, word for word…",
    name: "Ed H.",
    context: "2023 Quicksilver 675 Weekend · Seattle",
  },
];
```

The section appears automatically once the array is non-empty. Three or
more reads best on the 3-column grid.

## Rules

- Verbatim only. Trim with an ellipsis if long; never reword.
- Get explicit permission to publish and to use their name.
- Don't attribute a quote to anyone who didn't give it.
- If someone declines, that's the end of it — no paraphrasing them in.
