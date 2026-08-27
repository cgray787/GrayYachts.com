const GRAPHQL_URL = "https://www.facebook.com/api/graphql/";
const DETAIL_PHOTOS_DOC_ID = "10059604367394414";
const DETAIL_INFO_DOC_ID = "26090240497332612";
const HEADERS = {
  "content-type": "application/x-www-form-urlencoded",
  "sec-fetch-site": "same-origin",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36",
};

export type FacebookListingDetails = {
  id: string;
  title: string | null;
  ask: number | null;
  askLabel: string | null;
  description: string | null;
  images: string[];
  location: string | null;
  sellerName: string | null;
  sellerProfileUrl: string | null;
  url: string;
};

type PhotoNode = { image?: { uri?: string } };
type SellerNode = { id?: string; name?: string | { text?: string }; marketplace_user_profile?: { id?: string } };
type DetailTarget = {
  listing_photos?: PhotoNode[];
  marketplace_listing_title?: unknown;
  listing_title?: unknown;
  title?: unknown;
  listing_price?: { formatted_amount?: unknown; amount?: unknown; amount_with_offset_in_currency?: unknown };
  price?: { formatted_amount?: unknown; amount?: unknown; amount_with_offset_in_currency?: unknown };
  formatted_price?: unknown;
  redacted_description?: unknown;
  location_text?: unknown;
  marketplace_listing_seller?: SellerNode;
};
type GraphResponse = {
  data?: { viewer?: { marketplace_product_details_page?: { target?: DetailTarget } } };
  errors?: { message?: string }[];
};

export function facebookListingId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (!/(^|\.)facebook\.com$/i.test(url.hostname)) return null;
    return url.pathname.match(/\/marketplace\/item\/(\d+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function graphQL(docId: string, variables: object) {
  const body = new URLSearchParams({ variables: JSON.stringify(variables), doc_id: docId });
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: HEADERS,
    body: body.toString(),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Facebook returned HTTP ${response.status}`);
  const json = (await response.json()) as GraphResponse;
  if (json.errors?.length) throw new Error(json.errors[0]?.message || "Facebook GraphQL error");
  return json;
}

const textValue = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "text" in value) {
    const text = (value as { text?: unknown }).text;
    return typeof text === "string" ? text : null;
  }
  return null;
};

const numericPrice = (value: unknown): number | null => {
  if (typeof value === "number") return value > 10_000_000 ? value / 100 : value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export async function scrapeFacebookListing(listingId: string): Promise<FacebookListingDetails> {
  if (!/^\d+$/.test(listingId)) throw new Error("invalid Facebook listing id");
  const infoVars = {
    targetId: listingId,
    scale: 2,
    feedbackSource: 56,
    feedLocation: "MARKETPLACE_MEGAMALL",
    referralCode: "marketplace_top_picks",
    enableJobEmployerActionBar: false,
    enableJobSeekerActionBar: false,
    useDefaultActor: false,
    __relay_internal__pv__CometUFICommentActionLinksRewriteEnabledrelayprovider: false,
    __relay_internal__pv__CometUFICommentAvatarStickerAnimatedImagerelayprovider: false,
    __relay_internal__pv__CometUFIReactionsEnableShortNamerelayprovider: false,
    __relay_internal__pv__CometUFIShareActionMigrationrelayprovider: true,
    __relay_internal__pv__CometUFI_dedicated_comment_routable_dialog_gkrelayprovider: false,
    __relay_internal__pv__GHLShouldChangeAdIdFieldNamerelayprovider: true,
    __relay_internal__pv__GHLShouldChangeSponsoredDataFieldNamerelayprovider: true,
    __relay_internal__pv__IsWorkUserrelayprovider: false,
    __relay_internal__pv__ShouldUpdateMarketplaceBoostListingBoostedStatusrelayprovider: false,
  };
  const [photosRes, infoRes] = await Promise.all([
    graphQL(DETAIL_PHOTOS_DOC_ID, { targetId: listingId }),
    graphQL(DETAIL_INFO_DOC_ID, infoVars),
  ]);
  const photosTarget = photosRes?.data?.viewer?.marketplace_product_details_page?.target;
  const target = infoRes?.data?.viewer?.marketplace_product_details_page?.target;
  if (!target && !photosTarget) throw new Error("Facebook listing was unavailable or private");

  const images = Array.isArray(photosTarget?.listing_photos)
    ? photosTarget.listing_photos
        .map((photo) => photo?.image?.uri)
        .filter((uri: unknown): uri is string => typeof uri === "string")
    : [];
  const title =
    textValue(target?.marketplace_listing_title) ??
    textValue(target?.listing_title) ??
    textValue(target?.title);
  const priceObj = target?.listing_price ?? target?.price;
  const askLabel =
    textValue(priceObj?.formatted_amount) ??
    textValue(target?.formatted_price) ??
    textValue(priceObj);
  const ask = numericPrice(priceObj?.amount ?? priceObj?.amount_with_offset_in_currency ?? askLabel);
  const seller = target?.marketplace_listing_seller;
  const sellerId = seller?.id ?? seller?.marketplace_user_profile?.id;

  return {
    id: listingId,
    title,
    ask,
    askLabel,
    description: textValue(target?.redacted_description),
    images,
    location: textValue(target?.location_text),
    sellerName: textValue(seller?.name),
    sellerProfileUrl: sellerId ? `https://www.facebook.com/marketplace/profile/${sellerId}` : null,
    url: `https://www.facebook.com/marketplace/item/${listingId}`,
  };
}
