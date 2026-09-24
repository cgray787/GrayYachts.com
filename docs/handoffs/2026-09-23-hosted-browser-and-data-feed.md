# Reliable yacht imports: hosted browser test and direct-data option

User requires arbitrary new listing URLs to work, without their Mac running. A saved Lagoon snapshot is not completion of that requirement.

## New evidence
Cloudflare Browser Run was tested via an isolated local Wrangler Worker using a **remote** BROWSER binding. The hosted snapshot request succeeded, but the actual YachtWorld page title was **Access Denied**. Target: https://www.yachtworld.com/yacht/2018-lagoon-50-9727102/. Evidence: machine-local artifacts/catalog/hosted-browser/cloudflare-yachtworld-result.json and .png. No production Worker or browser binding was changed. Initial REST OAuth request returned 401; the remote binding then successfully ran the browser, so this is a genuine target-site denial, not merely an API authentication failure.

Firecrawl and Cloudflare have both now failed to access this listing from their hosted browsers. Do not recommend either as a proven automatic fix. Browserbase has not been connected or tested, so it remains a candidate only.

## More dependable data source
Official inventory API documentation: https://api.boats.com/docs/services/details?s=inventory
Authentication: https://api.boats.com/docs/overview
Co-brokerage offer/scope: https://www.boatsgroup.com/solutions/co-brokerage-api/

The API supports exact source-ID searches: YachtWorldID, BtolID (BoatTrader), BcnaID (boats.com). Returned inventory can include Images/Uri and structured specs. Feed scope depends on the account's entitlement. The co-brokerage offering advertises up to 10x BoatWizard listing count, maximum 10,000 listings; it is NOT unlimited access to every boat or every broker website. A BoatWizard login alone does not prove API access.

No relevant API/feed/browser keys found among variable names in the app .env.local or known agents environment file. Do not print or ask the user to paste credentials into chat. Asked asynchronously whether Jeff Brown Yachts has API/co-brokerage access; no answer at writing.

## Integration decision pending access
Prefer an entitled exact-ID feed lookup, then permitted live capture, then dated saved capture. Archive authorized original photo bytes. Missing entitlement/removed listings require an explicit recoverable state; never substitute another vessel or fabricate specs. Confirm photo-storage and display permissions under the actual feed agreement before enabling it. Browser availability cannot be guaranteed for external sites.

## Draft request for user's account representative (NOT SENT)
Does the Jeff Brown Yachts/Gray Yachts account have Boats Group Inventory API or Co-Brokerage API access for grayyachts.com? We need lookup by YachtWorldID, BtolID and BcnaID, including listing specifications and original image URLs. Please confirm eligible inventory, lookup coverage for listing 9727102, update/removal requirements, permitted photo storage/display, credentials provisioning and pricing. We are not authorizing a subscription change with this inquiry.
