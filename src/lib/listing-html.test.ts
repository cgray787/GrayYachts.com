import { describe, expect, it } from "vitest";

import {
  extractListingTableFacts,
  extractListingTableValue,
  extractPrimaryListingImage,
  isUsableListingHtml,
  parseFeetAndInches,
} from "@/lib/listing-html";

const BOATS_HTML = `
<html>
  <head>
    <title>2007 Hunter 44 Deck Salon, Seattle Washington - boats.com</title>
    <script src="/cdn-cgi/challenge-platform/scripts/precursor/main.js"></script>
  </head>
  <body>
    <div id="boat-details">
      <table>
        <tr><th>Make</th><td>Hunter</td></tr>
        <tr><th>Model</th><td>44 Deck Salon</td></tr>
        <tr><th>Year</th><td>2007</td></tr>
        <tr><th>Price</th><td>US$139,000</td></tr>
        <tr><th>Type</th><td>Sail</td></tr>
        <tr><th>Length</th><td>43 ft</td></tr>
        <tr><th>Location</th><td>Seattle, Washington</td></tr>
      </table>
    </div>
    <div id="measurements"><table>
      <tr><th>LOA</th><td>43 ft 2 in</td></tr>
      <tr><th>Beam</th><td>14 ft 6 in</td></tr>
    </table></div>
    <div id="propulsion"><table>
      <tr><th>Engine Make</th><td>Yanmar</td></tr>
      <tr><th>Engine Model</th><td>4JH4E</td></tr>
      <tr><th>Power</th><td>56 hp</td></tr>
    </table></div>
    <div id="other-specs"><table>
      <tr><th>Guest Cabins</th><td>2</td></tr>
    </table></div>
    <ul><li data-src_w0="https://images.boats.com/hunter-44-hero.jpg"></li></ul>
  </body>
</html>`;

describe("boats.com listing HTML", () => {
  it("keeps a complete listing even when Cloudflare challenge code is injected", () => {
    expect(isUsableListingHtml(BOATS_HTML)).toBe(true);
  });

  it("rejects a real challenge page with no listing evidence", () => {
    expect(
      isUsableListingHtml("<html><title>Just a moment...</title><script src='/cdn-cgi/challenge-platform/x.js'></script></html>"),
    ).toBe(false);
  });

  it("reads values from collapsed specification tables", () => {
    expect(extractListingTableValue(BOATS_HTML, "Price")).toBe("US$139,000");
    expect(extractListingTableValue(BOATS_HTML, "LOA")).toBe("43 ft 2 in");
    expect(extractListingTableValue(BOATS_HTML, "Beam")).toBe("14 ft 6 in");
    expect(extractListingTableValue(BOATS_HTML, "Guest Cabins")).toBe("2");
    expect(extractListingTableValue(BOATS_HTML, "Engine Make")).toBe("Yanmar");
  });

  it("converts feet and inches without rounding away the source value", () => {
    expect(parseFeetAndInches("43 ft 2 in")).toBeCloseTo(43.17, 2);
    expect(parseFeetAndInches("14 ft 6 in")).toBe(14.5);
  });

  it("uses the listing gallery image rather than a generic fallback", () => {
    expect(extractPrimaryListingImage(BOATS_HTML)).toBe("https://images.boats.com/hunter-44-hero.jpg");
  });

  it("builds verified card facts from the rendered listing tables", () => {
    expect(extractListingTableFacts(BOATS_HTML)).toEqual({
      year: 2007,
      price: "$139,000",
      priceNum: 139000,
      lengthFt: 43.17,
      beamFt: 14.5,
      cabins: 2,
      engine: "Yanmar 4JH4E 56 hp",
      location: "Seattle, Washington",
      type: "Sail",
      imageUrl: "https://images.boats.com/hunter-44-hero.jpg",
    });
  });
});
