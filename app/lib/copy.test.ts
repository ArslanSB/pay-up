import { describe, expect, it } from "vitest";
import { dashboardSubtitle, fineCountLabel, jarCountLabel, lastFineLabel } from "./copy";

const nbsp = (s: string) => s.replace(/ /g, " ");
const jar = (over: Partial<{ currency: string; unsettledTotal: number; unsettledCount: number }>) =>
  ({ id: "x", ownerId: "o", publicSlug: "s", title: "t", description: "", fineAmount: 100, visibility: "private" as const, createdAt: "", updatedAt: "", currency: "EUR", unsettledTotal: 0, unsettledCount: 0, ...over });

describe("fineCountLabel", () => {
  it("handles singular and plural", () => {
    expect(fineCountLabel(1)).toBe("1 fine");
    expect(fineCountLabel(0)).toBe("0 fines");
    expect(fineCountLabel(13)).toBe("13 fines");
  });
});

describe("jarCountLabel", () => {
  it("handles singular and plural", () => {
    expect(jarCountLabel(1)).toBe("1 jar");
    expect(jarCountLabel(3)).toBe("3 jars");
  });
});

describe("lastFineLabel", () => {
  it("says today and yesterday, then counts the days", () => {
    expect(lastFineLabel(0)).toBe("Your last fine was today.");
    expect(lastFineLabel(1)).toBe("Your last fine was yesterday.");
    expect(lastFineLabel(12)).toBe("12 days since your last fine.");
  });
});

describe("dashboardSubtitle", () => {
  it("invites when there are no jars", () => {
    expect(dashboardSubtitle([], "es-ES")).toBe("No jars yet. Make one for the thing you keep doing.");
  });
  it("sums a single currency with an ouch", () => {
    expect(nbsp(dashboardSubtitle([jar({ unsettledTotal: 1250 }), jar({ unsettledTotal: 850 })], "es-ES"))).toBe("21,00 € owed. Ouch.");
  });
  it("says nothing owed at zero", () => {
    expect(dashboardSubtitle([jar({})], "es-ES")).toBe("Nothing owed.");
  });
  it("counts jars when currencies are mixed", () => {
    expect(dashboardSubtitle([jar({ currency: "EUR", unsettledTotal: 100 }), jar({ currency: "USD", unsettledTotal: 100 }), jar({})], "es-ES")).toBe("3 jars.");
  });
});
