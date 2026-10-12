import { describe, expect, it } from "vitest";
import { openDatabase } from "./db.server";
import { buildJarView, parseFineLimit } from "./jar-view.server";
import { addFine, createJar, settle } from "./jars.server";
import { upsertUser } from "./users.server";

const nbsp = (s: string) => s.replace(/ /g, " ");

describe("buildJarView", () => {
  it("formats balance, groups and settlements in the viewer's locale and zone", () => {
    const db = openDatabase(":memory:");
    const owner = upsertUser(db, { provider: "github", providerId: "1", email: null, name: "O", avatarUrl: null });
    const jar = createJar(db, owner.id, { title: "Negativity jar", description: "d", fineAmount: 100, currency: "EUR", visibility: "public", publicSlug: null });
    addFine(db, jar.id, "old");
    settle(db, jar.id, "holiday fund");
    addFine(db, jar.id, "the weather");
    const newest = addFine(db, jar.id, null)!;
    const view = buildJarView(db, jar, { now: new Date(), timeZone: "Europe/Madrid", locale: "es-ES" });
    expect(nbsp(view.jar.fineAmountLabel)).toBe("1,00 €");
    expect(view.balance).toEqual({ total: 200, count: 2 });
    expect(nbsp(view.balanceLabel)).toBe("2,00 €");
    expect(view.groups).toHaveLength(1);
    expect(view.groups[0].label).toBe("Today");
    expect(view.groups[0].fines.map((t) => t.note)).toEqual([null, "the weather"]);
    expect(view.groups[0].fines[0].timeLabel).toMatch(/^\d{1,2}:\d{2}$/);
    expect(view.newestFineId).toBe(newest.id);
    expect(view.settlements).toHaveLength(1);
    expect(view.settlements[0].label).toMatch(/^Settled /);
    expect(view.settlements[0].summary).toBe("1 fine, holiday fund");
    expect(nbsp(view.settlements[0].totalLabel)).toBe("1,00 €");
    expect(view.settlements[0].fines).toHaveLength(1);
    expect(view.settlements[0].fines[0]).toMatchObject({ note: "old" });
    expect(nbsp(view.settlements[0].fines[0].amountLabel)).toBe("1,00 €");
    expect(view.settlements[0].fines[0].whenLabel).toMatch(/\d{1,2}:\d{2}$/);
    expect(view.more).toBeNull();
  });
  it("shows the newest ten unsettled fines and offers the next page", () => {
    const db = openDatabase(":memory:");
    const owner = upsertUser(db, { provider: "github", providerId: "1", email: null, name: "O", avatarUrl: null });
    const jar = createJar(db, owner.id, { title: "t", description: "", fineAmount: 100, currency: "EUR", visibility: "private", publicSlug: null });
    for (let i = 1; i <= 24; i++) addFine(db, jar.id, `fine ${i}`);
    const opts = { now: new Date(), timeZone: "UTC", locale: "en-GB" };
    const shown = (v: ReturnType<typeof buildJarView>) => v.groups.flatMap((g) => g.fines.map((f) => f.note));

    const first = buildJarView(db, jar, opts);
    expect(shown(first)).toHaveLength(10);
    expect(shown(first)[0]).toBe("fine 24");
    expect(first.more).toEqual({ count: 10, hidden: 14, limit: 20 });
    expect(first.balance).toEqual({ total: 2400, count: 24 });

    const third = buildJarView(db, jar, { ...opts, fineLimit: 30 });
    expect(shown(third)).toHaveLength(24);
    expect(third.more).toBeNull();
    expect(buildJarView(db, jar, { ...opts, fineLimit: 20 }).more).toEqual({ count: 4, hidden: 4, limit: 30 });
  });
  it("parseFineLimit reads whole pages from the URL and ignores nonsense", () => {
    const at = (q: string) => parseFineLimit(`http://localhost:3000/jars/x${q}`);
    expect(at("")).toBe(10);
    expect(at("?fines=20")).toBe(20);
    expect(at("?fines=25")).toBe(30);
    expect(at("?fines=0")).toBe(10);
    expect(at("?fines=-5")).toBe(10);
    expect(at("?fines=lots")).toBe(10);
    expect(at("?fines=99999999")).toBe(10_000);
  });
  it("is empty for a fresh jar", () => {
    const db = openDatabase(":memory:");
    const owner = upsertUser(db, { provider: "github", providerId: "1", email: null, name: "O", avatarUrl: null });
    const jar = createJar(db, owner.id, { title: "t", description: "", fineAmount: 100, currency: "EUR", visibility: "private", publicSlug: null });
    const view = buildJarView(db, jar, { now: new Date(), timeZone: "UTC", locale: "en-GB" });
    expect(view.groups).toEqual([]);
    expect(view.settlements).toEqual([]);
    expect(view.newestFineId).toBeNull();
    expect(view.more).toBeNull();
  });
});
