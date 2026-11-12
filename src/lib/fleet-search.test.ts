import { describe, expect, it } from "vitest";
import { DEFAULT_FLEET_SORT, FLEET_SORTS, readFleetSearch, writeFleetSearch, fleetRequirements } from "./fleet-search";

const choices = { price: ["$350k+"], length: ["35' – 50'"], year: ["2020 and newer"], location: ["Seattle, WA"], type: ["Power", "Sail"] };
const defaults = () => readFleetSearch(new URLSearchParams(), choices);

describe("fleet shareable search", () => {
  it("preserves the flagship-first default and rejects unsupported filter and sort values", () => {
    const state = readFleetSearch(new URLSearchParams("price=anything&type=javascript:alert(1)&sort=bogus&location=Atlantis"), choices);
    expect(state).toEqual(defaults());
    expect(state.sort).toBe(DEFAULT_FLEET_SORT);
  });
  it("round trips a complete filtered search, punctuation, and every supported sort", () => {
    for (const sort of FLEET_SORTS) {
      const state = { query: "Riva & Sea Ray", price: "$350k+", length: "35' – 50'", year: "2020 and newer", location: "Seattle, WA", type: "Power", sort };
      const url = writeFleetSearch(new URLSearchParams("utm_source=newsletter&price=old&price=duplicate"), state);
      expect(url.getAll("price")).toEqual(["$350k+"]);
      expect(url.get("utm_source")).toBe("newsletter");
      expect(readFleetSearch(new URLSearchParams(url.toString()), choices)).toEqual(state);
    }
  });
  it("clear removes owned parameters while retaining campaign data and the chosen sort", () => {
    const state = { ...defaults(), sort: "Year: Newest" as const };
    const url = writeFleetSearch(new URLSearchParams("q=Riva&type=Power&sort=Featured&utm_source=email"), state);
    expect(url.toString()).toBe("utm_source=email&sort=Year%3A+Newest");
    expect(writeFleetSearch(new URLSearchParams(), defaults()).toString()).toBe("");
  });
  it("bounds shared search text and strips control characters", () => {
    const state = readFleetSearch(new URLSearchParams({q: "\n" + "a".repeat(200)}), choices);
    expect(state.query).toBe("a".repeat(160));
  });
  it("passes all selected requirements to the inquiry without presenting sort as a requirement", () => {
    const state = { ...defaults(), query: "Riva", price: "$350k+", length: "35' – 50'", year: "2020 and newer", location: "Seattle, WA", type: "Power" };
    expect(fleetRequirements(state)).toBe("Search: Riva; Price: $350k+; Length: 35' – 50'; Year: 2020 and newer; Location: Seattle, WA; Type: Power");
    expect(fleetRequirements(defaults())).toBe("Help finding the right yacht");
  });
});
