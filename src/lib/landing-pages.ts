// Service and location landing pages (SEO strategy 2026-10-15).
// Keyword volumes: Google Keyword Planner, US, Oct 2025 to Sep 2026
// (Projects/10 - Gray Yachts/13 - Marketing & Ads/seo-keywords/keyword-volumes-2026-10-15.tsv).
// Every claim here must be verifiable: services come from the site footer, valuation details
// from public/sell.html, listings from src/lib/fleet.ts, show dates from their organizers.
// Customer copy uses no dashes (brand rule).

export type LandingSection = { heading: string; paragraphs: string[]; bullets?: string[] };
export type LandingPage = {
  kind: 'service' | 'location';
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  heroTitle: string;
  intro: string;
  primaryKeyword: string;
  keywords: string[];
  sections: LandingSection[];
  faq: { question: string; answer: string }[];
  related: { href: string; label: string }[];
  /** location pages: fleet `location` values that belong to this area */
  listingAreas?: string[];
  events?: { name: string; dates: string; url: string }[];
};

const SELL = { href: '/sell', label: 'Start a no obligation valuation' };
const FLEET = { href: '/fleet', label: 'See boats currently listed' };
const CONNOR = { href: '/about-connor-gray', label: 'Meet Connor Gray' };

export const landingPages: LandingPage[] = [
  {
    kind: 'service', slug: 'yacht-brokerage',
    title: 'Sell Your Yacht with a Pacific Northwest Broker | Gray Yachts',
    description: 'Selling a boat or yacht in Seattle and the Pacific Northwest? How brokerage works with Gray Yachts and Jeff Brown Yachts, from pricing and marketing to closing.',
    eyebrow: 'Yacht brokerage', heroTitle: 'Sell your yacht with a broker who knows these waters.',
    intro: 'Pricing, marketing, showings and closing for Pacific Northwest owners.',
    primaryKeyword: 'yacht broker',
    keywords: ['yacht broker', 'boat brokerage', 'yacht brokerage', 'boat brokers', 'sell my boat', 'sell my yacht', 'sell boat', 'sell your yacht', 'how to sell a boat', 'sell my boat online', 'sell boat online', 'yacht broker fees', 'boat broker fees', 'yacht broker commission', 'boat broker commission', 'what percentage do boat brokers charge', 'how do boat brokers get paid', 'boat consignment', 'boat consignment sales', 'brokerage vs consignment boat', 'private sale vs broker boat', 'how long does it take to sell a boat', 'sell boat to dealer', 'sell my sailboat', 'boat broker', 'boat brokers near me', 'yacht brokers near me', 'yacht dealership', 'boat broker commission rate', 'boat buyer broker', 'used boat brokers near me', 'yacht broker commission agreement', 'yacht broker commission percentage', 'yacht broker commission rates', 'yacht broker percentage', 'yacht brokerage companies'],
    sections: [
      { heading: 'What does a yacht broker do when you sell?', paragraphs: [
        'A yacht broker represents you through the whole sale: setting a realistic asking price, preparing and marketing the boat, screening buyers, arranging showings and sea trials, and carrying the paperwork through to closing. Gray Yachts works with owners across Seattle and the Pacific Northwest alongside Jeff Brown Yachts.',
        'The point of using a broker is that a qualified buyer, a written offer and an orderly closing are handled by someone whose job is the sale, while you keep using or maintaining the boat.' ] },
      { heading: 'How a sale works, step by step', paragraphs: ['Every boat is different, but most sales follow the same path.'], bullets: [
        'Valuation: a market review of comparable boats currently listed, with a broker reading your boat\'s condition, equipment and records.',
        'Preparation: what to fix, clean or document before photos, and which records buyers ask for first.',
        'Marketing: professional photography, drone video and 3D walkthroughs, so serious buyers can judge the boat before they travel.',
        'Showings and sea trial: qualified buyers see the boat, usually where it is moored, then run it on the water.',
        'Survey and closing: the buyer\'s independent survey, any renegotiation, then title and funds change hands.' ] },
      { heading: 'What does a yacht broker charge?', paragraphs: [
        'Brokerage commission is a percentage of the sale price, and it is agreed in writing in the listing agreement before any marketing begins. Ask Connor for the terms that would apply to your boat; nothing is charged for the valuation conversation itself.' ] },
      { heading: 'Brokerage, consignment or a private sale?', paragraphs: [
        'With a private sale you handle pricing, advertising, strangers on your boat, sea trials and paperwork yourself. Consignment usually means handing the boat to a dealer to sell from their location. With brokerage the boat normally stays in your slip, you keep ownership until closing, and the broker manages buyers and the process around you.',
        'Selling to a dealer outright can be fastest, but the price reflects the dealer\'s need to resell. A brokerage sale aims for the market price instead.' ] },
    ],
    faq: [
      { question: 'How long does it take to sell a boat?', answer: 'It depends most on price, condition and season. A well priced, well presented boat draws serious buyers sooner; an overpriced one sits. Your valuation conversation should cover timing for your boat specifically.' },
      { question: 'Do I have to move my boat to sell it?', answer: 'Usually not. Showings and sea trials are normally arranged where the boat is moored.' },
      { question: 'Can I keep using my boat while it is listed?', answer: 'In most cases, yes. It helps to keep it clean, maintained and available for showings.' },
      { question: 'What percentage do yacht brokers charge?', answer: 'Yacht broker commission is a percentage of the sale price, and the rate is agreed in writing in the listing agreement before any marketing starts. Ask Connor for the rate that would apply to your boat; the valuation conversation itself costs nothing.' },
      { question: 'Is a yacht broker the same as a yacht dealership?', answer: 'Not quite. A dealership sells new boats for the builders it represents. A broker represents an owner selling a used boat, or a buyer, across the whole market. Jeff Brown Yachts works both ways: as a dealer for the brands it represents and as a brokerage.' },
      { question: 'Do I need a boat broker near me?', answer: 'It helps to work with one who knows the local market and can attend showings and sea trials where your boat is moored. Gray Yachts works across Puget Sound and the North Sound, from Tacoma to Anacortes and Bellingham.' },
    ],
    related: [SELL, { href: '/services/boat-valuation', label: 'How a boat valuation works' }, { href: '/services/yacht-marketing', label: 'Listing photography, drone video and 3D tours' }, FLEET],
  },
  {
    kind: 'service', slug: 'boat-valuation',
    title: 'Boat Valuation Guide: What Is My Boat Worth? | Gray Yachts',
    description: 'How a boat valuation works for Pacific Northwest owners, how it differs from an appraisal or marine survey, and how to get a no obligation valuation.',
    eyebrow: 'Boat valuation', heroTitle: 'What is your boat worth in today\'s market?',
    intro: 'A real market view of your boat, reviewed by a working broker.',
    primaryKeyword: 'boat valuation',
    keywords: ['boat valuation', 'boat valuation guide', 'yacht valuation', 'what is my boat worth', 'what is your boat worth', 'what is my boat worth to sell', 'what is my boat worth online', 'boat appraisal', 'boat appraisal online', 'boat appraisal cost', 'boat appraisal guide', 'boat valuation calculator', 'boat valuation online', 'boat valuation tool', 'boat valuation 2026', 'yacht valuation survey', 'boat survey cost', 'marine survey cost', 'yacht survey cost', 'best time to sell a boat', 'best time to sell a used boat', 'yacht price', 'luxury yacht price', 'nada boat values', 'value my boat', 'how much is my boat worth', 'used boat prices', 'used boat values', 'boat appraisal near me', 'used boat values nada', 'boat appraisal calculator', 'boat appraisal website', 'boat valuation in dollars', 'how much is my boat worth blue book'],
    sections: [
      { heading: 'How does a boat valuation work?', paragraphs: [
        'A broker\'s boat valuation is a market opinion of what your boat should list and sell for now. It starts with comparable boats currently on the market, then adjusts for the things comparables cannot show: condition, engine hours, equipment, upgrades, maintenance records and where the boat is located.',
        'With Gray Yachts it starts with six quick questions on the valuation page, about a minute of your time, followed by current asking price comparables and a working broker\'s review. There is no obligation to list.' ] },
      { heading: 'Why online boat value calculators miss the mark', paragraphs: [
        'Online calculators and price guides work from averages for a make, model and year. They cannot see a repowered engine, a fresh bottom job, new electronics or a neglected maintenance history, and those details move the price of a used boat more than the model year does. Use a calculator as a rough starting point, not as your asking price.' ] },
      { heading: 'NADA values, blue book prices and real used boat prices', paragraphs: [
        'Many owners asking how much their boat is worth start with NADA boat values or a blue book style price guide. Those guides publish typical used boat values for a make, model and year, which makes them a fair first look.',
        'What a guide cannot tell you is what boats like yours are actually listed for in the Pacific Northwest right now, or how your boat compares on condition, hours and equipment. That gap is what a broker valuation closes: the guide gives a range, and the market review tells you where in that range your boat belongs.' ] },
      { heading: 'Valuation, appraisal or marine survey: which do you need?', paragraphs: ['They answer different questions.'], bullets: [
        'Broker valuation: what the boat should be priced at to sell in the current market. This is what you need before listing.',
        'Appraisal: a formal value statement, often for insurance, estates or financing.',
        'Marine survey: an independent inspection of condition by a marine surveyor. Buyers, lenders and insurers usually require one, and its cost generally depends on the boat\'s size and type.' ] },
      { heading: 'When is the best time to get a valuation?', paragraphs: [
        'Before you decide to sell, not after. A current valuation tells you whether to list now, wait for the season, or invest in a few improvements first. Many Pacific Northwest owners plan a sale around the spring and summer boating season, when more buyers are actively looking.' ] },
    ],
    faq: [
      { question: 'Is the valuation an obligation to list my boat?', answer: 'No. The valuation is no obligation; you decide what to do with it.' },
      { question: 'What information do you need?', answer: 'The basics of your boat and its condition. The valuation page asks six quick questions, and records such as service history and recent upgrades help sharpen the number.' },
      { question: 'Is a broker valuation the same as a survey?', answer: 'No. A valuation is a pricing opinion; a marine survey is an independent condition inspection, usually ordered by the buyer during a sale.' },
      { question: 'Is there a boat valuation calculator I can use?', answer: 'Online calculators and price guides give a quick ballpark. For a number you can list at, the valuation page asks six quick questions and a working broker reviews the answer against current comparables, with no obligation.' },
      { question: 'Do you do boat appraisals near me?', answer: 'A formal appraisal for insurance, an estate or a lender is done by an independent marine surveyor. Gray Yachts provides broker valuations for owners across Puget Sound and the North Sound who are thinking about selling.' },
    ],
    related: [SELL, { href: '/services/yacht-brokerage', label: 'How selling with a broker works' }, FLEET, CONNOR],
  },
  {
    kind: 'service', slug: 'buyer-representation',
    title: 'Buying a Used Yacht with a Buyer\'s Broker | Gray Yachts',
    description: 'Buying a used boat or yacht in the Pacific Northwest? How a buyer\'s broker helps with the search, offer, sea trial and marine survey through closing.',
    eyebrow: 'Buyer representation', heroTitle: 'Buy your next yacht with someone on your side.',
    intro: 'Search, offer, sea trial, survey and closing for Pacific Northwest buyers.',
    primaryKeyword: 'boat buyer broker',
    keywords: ['boat buyer broker', 'buyer\'s broker yacht', 'how to buy a used yacht', 'yacht buying process', 'marine survey', 'marine survey for boat', 'marine survey checklist', 'marine surveyor', 'sea trial boat', 'sea trials', 'sea trial checklist', 'sea trial report', 'used yachts for sale washington state', 'yachts for sale pacific northwest', 'boats for sale pacific northwest', 'trawler yachts for sale pacific northwest', 'power boats for sale pacific northwest', 'boat survey cost', 'boat survey price', 'boat surveyor', 'boat surveyor near me', 'marine survey cost', 'marine survey near me', 'marine surveyor near me', 'yacht surveyor', 'boat survey cost per foot', 'boat surveyors in my area', 'hull survey cost', 'marine boat surveyor near me', 'marine diesel surveyors', 'marine engine survey cost', 'marine engine surveyor', 'marine engine surveyor near me', 'marine survey companies', 'pre purchase boat inspection', 'pre purchase survey', 'yacht survey cost', 'yacht surveyor near me', 'yacht surveyors near me', 'buy luxury yacht', 'boat loan for private sale', 'boat loan terms', 'boat loans for older boats', 'buy a yacht', 'buy used boats', 'normal boat loan terms', 'typical boat loan terms', 'used yacht financing', 'yacht financing', 'yacht loans', 'yacht purchase', 'financing a yacht purchase', 'motor yacht financing', 'used yacht loans', 'yacht financing terms', 'yacht loan terms'],
    sections: [
      { heading: 'What does a buyer\'s broker do?', paragraphs: [
        'A buyer\'s broker works for you, not for the seller. That means helping you define the right boat for how you will use it, finding listed and unlisted candidates, reading listings critically, structuring an offer, and guiding the sea trial, survey and closing.' ] },
      { heading: 'How to buy a used yacht, step by step', paragraphs: ['A typical purchase follows this order.'], bullets: [
        'Define the mission: where you cruise, how many people, how many nights aboard and your budget including moorage and upkeep.',
        'Shortlist boats and review their listings, photos, walkthroughs and history.',
        'Make a written offer, normally subject to a satisfactory sea trial and marine survey.',
        'Sea trial: run the boat on the water to check how it handles and how its systems perform.',
        'Marine survey: an independent surveyor you choose inspects the boat; the findings can lead to repairs, a price adjustment or walking away.',
        'Closing: funds, title and documentation change hands, and you take delivery.' ] },
      { heading: 'Budget for more than the purchase price', paragraphs: [
        'The asking price is only part of the cost of owning a yacht. Before you make an offer, plan for moorage, insurance, routine maintenance and haul outs, any work the survey turns up, and the taxes and registration that apply where you will keep the boat. Knowing the full number up front keeps the search focused on boats you will enjoy owning, not just buying.' ] },
      { heading: 'Why the sea trial and survey matter', paragraphs: [
        'They are where problems surface before you own them. A marine survey is the single most important protection in a used boat purchase, and lenders and insurers generally require one. Your broker helps you schedule both and make sense of the results.' ] },
      { heading: 'What does a marine survey cost?', paragraphs: [
        'Marine surveyors usually price a survey by the foot of boat length. Discover Boating, the consumer site of the National Marine Manufacturers Association, suggests planning on around $20 to $25 per foot, and notes that many surveyors set a minimum charge that can exceed that rate on small boats. A 40 foot yacht at those rates is roughly $800 to $1,000 before any extras.',
        'BoatUS also recommends a separate engine inspection by a marine engine surveyor, because engine problems are the issue used boat buyers run into most. Ask each surveyor for a written quote that says what is included, and whether a later reinspection costs extra.' ],
        bullets: [
          'Condition and value survey: the most common type, and the one buyers order before a purchase.',
          'Insurance survey: covers the items an insurer requires, narrower than a full condition and value survey.',
          'Appraisal survey: a formal value estimate, often for an estate or a divorce.',
          'Damage survey: assesses storm or accident damage and the cost to repair it.' ] },
      { heading: 'Finding a marine surveyor near you', paragraphs: [
        'Choose your own surveyor, independent of the seller; BoatUS advises buyers not to rely on a surveyor referred by the seller or the broker. Look for membership in a professional body such as SAMS or NAMS, ask whether the surveyor regularly works on boats like the one you are buying, and check their availability against your sea trial date.' ] },
      { heading: 'Financing a yacht purchase', paragraphs: [
        'Most buyers who finance a used yacht talk to a marine lender before making an offer, so the offer can be written around the loan. Each lender sets its own terms for down payment, loan length and the age of boat it will finance, and a survey on a used boat is generally part of approval.',
        'Older boats and private party purchases can narrow the list of lenders, so ask early if either applies to you. Connor can coordinate the survey, closing documents and timeline with your lender so the financing and the purchase finish together.' ] },
    ],
    faq: [
      { question: 'Who chooses the marine surveyor?', answer: 'The buyer does. The surveyor should be independent and work for you.' },
      { question: 'Can I get a loan for an older boat?', answer: 'Some marine lenders finance older boats and some do not; each sets its own age and condition rules, and a recent survey is usually required. Ask lenders before you shortlist an older boat.' },
      { question: 'How long does a marine survey take?', answer: 'It depends on the size and complexity of the boat. Ask the surveyor when you book, and plan around any haul out needed to inspect the hull.' },
      { question: 'Can a buyer\'s broker show me boats listed by other brokers?', answer: 'Yes. Brokers routinely work together, so your search is not limited to one firm\'s listings.' },
    ],
    related: [FLEET, { href: '/brands', label: 'Featured brands' }, { href: '/boat-shows', label: 'Boat shows' }, CONNOR],
  },
  {
    kind: 'service', slug: 'yacht-marketing',
    title: 'Yacht Listing Photography, Drone Video and 3D Tours | Gray Yachts',
    description: 'How Gray Yachts markets a listed yacht: professional photography, drone cinematography and 3D walkthroughs that let serious buyers judge a boat before they travel.',
    eyebrow: 'Yacht marketing', heroTitle: 'Marketing that lets buyers see the boat before they travel.',
    intro: 'Photography, drone cinematography and 3D walkthroughs for listings.',
    primaryKeyword: 'yacht marketing',
    keywords: ['yacht marketing', 'yacht photography', 'yacht listing photography seattle', 'drone yacht video', 'drone cinematography', '3d walkthrough yacht', 'sell my boat online', 'sell boat online'],
    sections: [
      { heading: 'Why presentation sets the price', paragraphs: [
        'Most buyers shortlist boats online before they ever step aboard. A listing with clear, honest, well lit photography, a drone view of the boat on the water and a walkthrough of the interior answers the questions that would otherwise take a trip to the dock, so the buyers who do travel are already serious.' ] },
      { heading: 'What is included', paragraphs: ['Gray Yachts listings can include:'], bullets: [
        'Yacht photography: exterior, interior, helm, engine room and the details buyers ask about.',
        'Drone cinematography: the boat underway and at the dock, showing its profile and setting.',
        '3D walkthroughs: a virtual tour of the layout that buyers can explore on their own time.' ] },
      { heading: 'How to prepare your boat for photos', paragraphs: [
        'Clean and declutter, remove personal items, open blinds for light, and fix small visible issues first. Photos are permanent; a few hours of preparation shows in every one.' ] },
      { heading: 'A brochure for every listing', paragraphs: [
        'Every boat Gray Yachts lists gets its own listing page and a branded PDF brochure with the photography, specifications and description in one place. Buyers can save it, print it, or forward it to a partner or surveyor, which keeps your boat in front of them after they leave the website.' ] },
      { heading: 'What buyers look at first', paragraphs: ['Buyers tend to judge a listing on a few things, in roughly this order:'], bullets: [
        'The lead photo: the boat looking its best, on the water or cleanly at the dock.',
        'The layout: how many people it sleeps, the galley and the helm.',
        'The engine room and records: hours, service history and recent work.',
        'Price against similar boats currently listed, which is why a realistic valuation matters as much as the photos.' ] },
    ],
    faq: [
      { question: 'Is marketing part of listing my boat?', answer: 'Ask Connor what marketing applies to your listing; it is set out when the listing is agreed.' },
    ],
    related: [{ href: '/services/yacht-brokerage', label: 'How selling with a broker works' }, SELL, FLEET],
  },
  {
    kind: 'location', slug: 'seattle',
    title: 'Seattle Yacht Broker and Boats for Sale | Gray Yachts',
    description: 'Selling or buying a boat in Seattle, on Lake Union, Lake Washington or Puget Sound? Gray Yachts and Jeff Brown Yachts, with current Seattle area listings.',
    eyebrow: 'Seattle', heroTitle: 'Yacht brokerage for Seattle owners and buyers.',
    intro: 'Puget Sound, Lake Union and Lake Washington.',
    primaryKeyword: 'yacht broker seattle',
    keywords: ['yacht broker seattle', 'boat broker seattle', 'yacht brokerage seattle', 'seattle yacht brokers', 'boats for sale seattle', 'boats for sale seattle wa', 'yachts for sale seattle', 'sailboats for sale seattle', 'boats for sale seattle area', 'sell my boat seattle', 'boat valuation seattle', 'boat moorage seattle', 'ocean alexander for sale seattle', 'back cove for sale seattle', 'boat shows seattle', 'boat show seattle wa', 'seattle boat show 2027', 'everett yacht sales', 'seattle yachts for sale', 'used boats for sale seattle', 'boat show seattle 2026', 'boat show seattle lake union', 'cobalt boats for sale seattle', 'sea ray boats for sale seattle'],
    listingAreas: ['Seattle, WA', 'Madrona Marina, WA', 'Renton, WA', 'Edmonds, WA'],
    events: [{ name: 'Seattle Boat Show', dates: 'February 5 to 13, 2027', url: 'https://seattleboatshow.com/' }],
    sections: [
      { heading: 'Selling a boat in Seattle', paragraphs: [
        'Seattle owners keep boats on salt water and fresh water: Puget Sound, Lake Union and Lake Washington. Gray Yachts works with Seattle sellers alongside Jeff Brown Yachts, whose Seattle office is on West Commodore Way, so showings and sea trials can be arranged where your boat is moored.',
        'A Seattle sale starts with a valuation against comparable boats currently listed in the region, then preparation, marketing with photography, drone video and 3D walkthroughs, and a managed process through survey and closing.',
        'The Seattle area runs well beyond the city itself. Gray Yachts works with owners and buyers from Everett and Edmonds in the north to Renton and Des Moines in the south, so a boat does not have to be moored in Seattle to be sold or shown by a Seattle yacht broker.' ] },
      { heading: 'Buying a boat in Seattle', paragraphs: [
        'Buyers searching for boats for sale in Seattle can see what is currently listed below, and work with Connor on boats listed elsewhere. Plan your search around where you will moor the boat and how you will use it, from Lake Washington day trips to cruising the San Juan Islands.' ] },
      { heading: 'Lake boats and Sound boats', paragraphs: [
        'Seattle is unusual in having fresh water and salt water moorage minutes apart, and that shapes both pricing and buyer questions. Boats kept on Lake Washington or Lake Union see fresh water, while boats kept on the Sound live in salt water, so buyers ask where a boat has been moored and how its systems have been maintained. A good listing answers that up front.',
        'Current Gray Yachts listings around Seattle range from day boats and runabouts to a 42 foot Hunter Passage sailboat and a Back Cove 30, priced from about $30,000 to $325,000, moored from Renton and Madrona on Lake Washington to Edmonds on the Sound.' ] },
    ],
    faq: [
      { question: 'Do you only work with boats in Seattle?', answer: 'No. Seattle is home base, and Gray Yachts works with owners and buyers across Puget Sound and the wider Pacific Northwest.' },
      { question: 'When is the Seattle Boat Show?', answer: 'The 2027 Seattle Boat Show runs February 5 to 13, 2027, according to the show organizer.' },
    ],
    related: [SELL, FLEET, { href: '/locations/washington', label: 'Boats for sale across Washington State' }, { href: '/services/yacht-brokerage', label: 'How selling with a broker works' }, { href: '/boat-shows', label: 'Boat shows' }],
  },
  {
    kind: 'location', slug: 'tacoma',
    title: 'Tacoma and South Sound Yacht Broker | Gray Yachts',
    description: 'Buying or selling a boat in Tacoma, Gig Harbor or the South Sound? Gray Yachts and Jeff Brown Yachts, with current listings and a no obligation valuation.',
    eyebrow: 'Tacoma and South Sound', heroTitle: 'Brokerage for Tacoma and South Sound boats.',
    intro: 'Tacoma, Des Moines and the southern reaches of Puget Sound.',
    primaryKeyword: 'boats for sale tacoma',
    keywords: ['boats for sale tacoma', 'boats for sale tacoma wa', 'yachts for sale tacoma', 'yachts for sale tacoma wa', 'sailboats for sale tacoma', 'used boats for sale tacoma', 'yacht broker tacoma', 'boat broker tacoma', 'sell my boat tacoma', 'boat valuation tacoma', 'boats for sale puget sound', 'yachts for sale puget sound', 'sailboats for sale puget sound', 'gig harbor yacht sales'],
    listingAreas: ['Tacoma, WA', 'Des Moines, WA'],
    sections: [
      { heading: 'Selling a boat in Tacoma and the South Sound', paragraphs: [
        'South Sound owners, from Tacoma and Gig Harbor to Des Moines, do not need to move a boat to Seattle to sell it. Showings and sea trials can be arranged where the boat is moored, and the valuation, marketing and closing work the same way they do anywhere on Puget Sound.',
        'Start with a no obligation valuation: six quick questions, current asking price comparables, and a review by a working broker.' ] },
      { heading: 'Buying a boat in Tacoma', paragraphs: [
        'Looking at boats for sale in Tacoma? Current Gray Yachts listings in Tacoma and the South Sound are shown below. If the right boat is not here yet, Connor can search listings across the region for you.' ] },
      { heading: 'What is listed in the South Sound now', paragraphs: [
        'Today\'s South Sound listings span two very different buyers. In Tacoma there are two cruisers of about 24 feet, a Defiance San Juan 220 and a Jeanneau NC 695, sized for day trips and weekends around the South Sound. In Des Moines there is a 2021 Sea Ray Sundancer 350, a larger cruiser for longer trips up the Sound.',
        'If you are selling a similar boat in the South Sound, those listings are a useful reference point for what buyers are seeing right now, and a valuation will tell you where your own boat fits.' ] },
      { heading: 'Selling from the South Sound to the whole region', paragraphs: [
        'Buyers for South Sound boats come from across Puget Sound, not just Tacoma. Online marketing with photography, drone video and 3D walkthroughs lets a buyer in Seattle or Olympia shortlist your boat before making the drive, so the people who come to the dock are already serious.' ] },
    ],
    faq: [
      { question: 'Do I need to bring my boat to Seattle?', answer: 'No. Showings and sea trials are normally arranged where the boat is moored.' },
    ],
    related: [SELL, FLEET, { href: '/locations/seattle', label: 'Seattle yacht brokerage' }, { href: '/services/buyer-representation', label: 'Buying with a broker' }],
  },
  {
    kind: 'location', slug: 'anacortes',
    title: 'Anacortes and North Sound Yacht Broker | Gray Yachts',
    description: 'Buying or selling a yacht in Anacortes, Bellingham or the San Juan Islands? Gray Yachts and Jeff Brown Yachts, with current Anacortes listings.',
    eyebrow: 'Anacortes and North Sound', heroTitle: 'Brokerage for Anacortes and the North Sound.',
    intro: 'Anacortes, Bellingham and the gateway to the San Juan Islands.',
    primaryKeyword: 'yachts for sale anacortes',
    keywords: ['yachts for sale anacortes', 'yachts for sale anacortes wa', 'boats for sale anacortes', 'boats for sale anacortes washington', 'sailboats for sale anacortes', 'used boats for sale anacortes washington', 'yacht broker anacortes', 'boat broker anacortes', 'sell my boat anacortes', 'boats for sale bellingham', 'boats for sale bellingham washington', 'yachts for sale bellingham wa', 'used boats for sale bellingham', 'sailboats for sale bellingham', 'ocean alexander for sale anacortes', 'yachts for sale san juan islands', 'anacortes yacht sales'],
    listingAreas: ['Anacortes, WA'],
    events: [{ name: 'Anacortes Boat and Yacht Show', dates: 'May 20 to 22, 2027', url: 'https://anacortesboatandyachtshow.com/' }],
    sections: [
      { heading: 'Selling a yacht in Anacortes and the North Sound', paragraphs: [
        'Anacortes is a home port for many cruising yachts heading into the San Juan Islands, and North Sound owners from Anacortes to Bellingham can sell without moving their boat south. Showings and sea trials happen where the boat is moored.',
        'Gray Yachts currently represents boats in Anacortes, listed below, including an Ocean Alexander 548.' ] },
      { heading: 'Buying in the North Sound', paragraphs: [
        'Buyers looking at boats for sale in Anacortes or Bellingham can start with the listings below and work with Connor on boats listed elsewhere in the region. The Anacortes Boat and Yacht Show, May 20 to 22, 2027, is a chance to see many cruising boats in one place.' ] },
      { heading: 'Cruising yachts for the islands and beyond', paragraphs: [
        'North Sound buyers are often shopping for range and comfort aboard: boats that can spend a week in the San Juan Islands or head north toward Canadian waters. The two current Anacortes listings fit that profile, a 1996 Ocean Alexander 548 motor yacht and a 1987 Trojan 10.8 Meter International.',
        'For sellers, that means presenting a cruising boat the way a cruising buyer reads it: accommodations, range, systems, electronics and maintenance records, documented clearly before the first showing.' ] },
      { heading: 'Selling without moving your boat', paragraphs: [
        'Owners from Anacortes to Bellingham do not need to bring a boat to Seattle to sell it. Valuation, marketing, showings and sea trials are arranged around where the boat lives, and serious buyers come to it.' ] },
    ],
    faq: [
      { question: 'Do you cover Bellingham?', answer: 'Yes. Gray Yachts works with North Sound owners and buyers, including Bellingham. Current listings are in Anacortes.' },
      { question: 'When is the Anacortes Boat and Yacht Show?', answer: 'May 20 to 22, 2027, according to the show organizer.' },
    ],
    related: [SELL, FLEET, { href: '/fleet/ocean-alexander-548', label: '1996 Ocean Alexander 548' }, { href: '/services/yacht-brokerage', label: 'How selling with a broker works' }],
  },
  {
    // Title and report of sale facts: WA DOL "Report the sale of a boat" page, Vessel Report of Sale
    // form 420063 and Vehicle/Vessel Bill of Sale form 420065, read 2026-10-15.
    kind: 'location', slug: 'washington',
    title: 'Boats and Yachts for Sale in Washington State | Gray Yachts',
    description: 'Boats and yachts for sale across Washington State, and how a Washington boat sale works: title transfer, bill of sale and the report of sale, from DOL sources.',
    eyebrow: 'Washington State', heroTitle: 'Buying or selling a boat in Washington State.',
    intro: 'Puget Sound, Hood Canal, the lakes and the North Sound, with the paperwork explained.',
    primaryKeyword: 'boats for sale washington',
    keywords: ['boat bill of sale example', 'boat title transfer', 'how to transfer a boat title', 'boat transfer of ownership', 'how to get a bill of sale for a boat', 'transfer boat ownership online', 'what is a bill of sale for a boat', 'boats for sale in washington state', 'boats for sale washington', 'boats for sale washington state', 'trawlers for sale washington', 'vehicle vessel bill of sale washington', 'yachts for sale washington', 'yachts for sale washington state', 'boat bill of sale wa', 'boat bill of sale washington', 'boat bill of sale washington state', 'boats for sale pacific northwest', 'boats for sale puget sound', 'how do i transfer a title in washington state', 'ocean alexander for sale washington state', 'power boats for sale pacific northwest', 'selling a boat in wa', 'selling a boat in washington state', 'trawler yachts for sale pacific northwest', 'used boats for sale in washington state', 'used boats for sale pacific northwest', 'used boats for sale wa', 'used boats for sale washington', 'used boats for sale washington state', 'used yachts for sale washington state', 'vessel bill of sale washington state', 'washington boat title transfer', 'wooden boats for sale pacific northwest', 'yachts for sale pacific northwest', 'yachts for sale puget sound'],
    listingAreas: ['Seattle, WA', 'Madrona Marina, WA', 'Renton, WA', 'Edmonds, WA', 'Tacoma, WA', 'Des Moines, WA', 'Anacortes, WA', 'Port Townsend, WA', 'Seabeck, WA', 'Fall City, WA'],
    sections: [
      { heading: 'Boats for sale across Washington', paragraphs: [
        'Gray Yachts listings in Washington are spread across the state\'s boating waters: Seattle and Lake Washington, Puget Sound from Edmonds to Tacoma, Hood Canal at Seabeck, Port Townsend, and Anacortes at the edge of the San Juan Islands. Every current Washington listing is shown below, from 23 foot day boats and sailboats to a 54 foot Ocean Alexander motor yacht and a 50 foot Rozema aluminum vessel.',
        'Shopping the whole Pacific Northwest? Connor can also search boats listed by other brokers across Washington and help you compare them, so you are not limited to one firm\'s inventory.' ] },
      { heading: 'How a boat sale works in Washington', paragraphs: ['The Washington State Department of Licensing sets out the steps for a private boat sale. In short:'], bullets: [
        'The seller signs the title over: all registered and legal owners sign the Vessel Certificate of Title and give it to the buyer.',
        'A bill of sale records the price and date. DOL\'s own Vehicle/Vessel Bill of Sale form says it does not transfer the title by itself, and it is not a report of sale.',
        'The seller reports the sale to DOL within five days. DOL says the report protects the seller from civil and criminal liability, and there is no fee to report the sale of a boat.',
        'The buyer applies for a new title and registration within 15 calendar days of the purchase, at a vehicle licensing office, and pays the fees and taxes due. DOL\'s form says late transfer fees start at $50 and rise to a maximum of $125.' ] },
      { heading: 'Washington boat title transfer: the details that trip people up', paragraphs: [
        'The most common mistake is treating the bill of sale as the transfer. It is not: the signed title and the buyer\'s title application move ownership, and the seller\'s report of sale ends the seller\'s liability. Both sides have their own deadline, five days for the seller to report and 15 days for the buyer to apply.',
        'Boats documented with the US Coast Guard have their own federal paperwork as well, so confirm which applies to yours early. Check DOL for current fees and forms before you file; this page summarizes them and is not legal advice.' ] },
      { heading: 'Selling a boat in Washington State with a broker', paragraphs: [
        'With a broker, the paperwork is the last step of a managed sale rather than something you assemble alone. Gray Yachts and Jeff Brown Yachts handle pricing, marketing, buyer screening, showings and sea trials, then coordinate the survey, title and closing documents so both parties meet their deadlines.',
        'Start with a no obligation valuation: six quick questions, current asking price comparables, and a review by a working broker.' ] },
    ],
    faq: [
      { question: 'How do I transfer a boat title in Washington State?', answer: 'The seller signs the Vessel Certificate of Title over to the buyer, along with any other registered and legal owners. The buyer then takes or mails the signed title and a vessel title application to a vehicle licensing office within 15 calendar days and pays the fees and taxes, per DOL.' },
      { question: 'Do I need a bill of sale to sell a boat in Washington?', answer: 'It is good practice, and DOL publishes a Vehicle/Vessel Bill of Sale form for it. Remember that the bill of sale does not transfer the title by itself; the signed title and the buyer\'s title application do.' },
      { question: 'How long does the seller have to report the sale?', answer: 'Five days, according to DOL\'s boat page. Reporting is free and protects the seller from liability for the boat after the sale.' },
    ],
    related: [SELL, FLEET, { href: '/locations/seattle', label: 'Seattle yacht brokerage' }, { href: '/services/buyer-representation', label: 'Buying with a broker' }],
  },
];

export const servicePages = () => landingPages.filter(p => p.kind === 'service');
export const locationPages = () => landingPages.filter(p => p.kind === 'location');
export const landingPath = (p: LandingPage) => `/${p.kind === 'service' ? 'services' : 'locations'}/${p.slug}`;
export const findLanding = (kind: LandingPage['kind'], slug: string) => landingPages.find(p => p.kind === kind && p.slug === slug);
