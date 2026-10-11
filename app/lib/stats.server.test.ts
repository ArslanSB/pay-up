import { describe, expect, it } from "vitest";
import { makeUser } from "../test/helpers";
import { openDatabase, type Db } from "./db.server";
import { addFine, createJar, settle } from "./jars.server";
import { buildStatsView } from "./stats.server";

const nbsp = (s: string) => s.replace(/ /g, " ");
// Sunday 11 October 2026, midday in Madrid.
const now = new Date("2026-10-11T10:00:00Z");
const opts = { now, timeZone: "Europe/Madrid", locale: "en-GB" };

function jar(db: Db, ownerId: string, title: string, currency = "EUR", fineAmount = 100) {
  return createJar(db, ownerId, { title, description: "", fineAmount, currency, visibility: "private", publicSlug: null });
}

function fineAt(db: Db, jarId: string, iso: string) {
  const fine = addFine(db, jarId, null);
  if (!fine) throw new Error("no jar");
  db.prepare("UPDATE fines SET created_at = ? WHERE id = ?").run(iso, fine.id);
}

describe("buildStatsView", () => {
  it("is empty for a new account", () => {
    const db = openDatabase(":memory:");
    const view = buildStatsView(db, makeUser(db).id, opts);
    expect(view).toMatchObject({ jarCount: 0, fineCount: 0, owed: [], settled: [], daysSinceLastFine: null, worstDay: null, jars: [] });
    expect(view.weeks).toHaveLength(12);
    expect(view.weeks.every((w) => w.count === 0)).toBe(true);
    expect(view.weekdays.map((d) => d.label)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });

  it("splits owed from settled per jar and per currency, ignoring other people's jars", () => {
    const db = openDatabase(":memory:");
    const me = makeUser(db);
    const swearing = jar(db, me.id, "Swearing");
    const phone = jar(db, me.id, "Phone", "USD", 250);
    const quiet = jar(db, me.id, "Quiet");
    fineAt(db, swearing.id, "2026-10-01T10:00:00Z");
    fineAt(db, swearing.id, "2026-10-02T10:00:00Z");
    settle(db, swearing.id, null);
    fineAt(db, swearing.id, "2026-10-09T10:00:00Z");
    fineAt(db, phone.id, "2026-10-09T11:00:00Z");
    fineAt(db, jar(db, makeUser(db).id, "Not mine").id, "2026-10-09T10:00:00Z");

    const view = buildStatsView(db, me.id, opts);
    expect(view.jarCount).toBe(3);
    expect(view.fineCount).toBe(4);
    expect(view.owed.map(nbsp)).toEqual(["€1.00", "US$2.50"]);
    expect(view.settled.map(nbsp)).toEqual(["€2.00"]);
    expect(view.jars.map((j) => ({ ...j, owedLabel: j.owedLabel && nbsp(j.owedLabel) }))).toEqual([
      { id: swearing.id, title: "Swearing", fineCount: 3, settledCount: 2, owedCount: 1, owedLabel: "€1.00" },
      { id: phone.id, title: "Phone", fineCount: 1, settledCount: 0, owedCount: 1, owedLabel: "US$2.50" },
      { id: quiet.id, title: "Quiet", fineCount: 0, settledCount: 0, owedCount: 0, owedLabel: null },
    ]);
  });

  it("buckets fines into Monday weeks and weekdays in the viewer's timezone", () => {
    const db = openDatabase(":memory:");
    const me = makeUser(db);
    const j = jar(db, me.id, "Snacks");
    // Friday 9 October, late evening in Madrid: still Friday there, Saturday in UTC+14.
    fineAt(db, j.id, "2026-10-09T21:30:00Z");
    fineAt(db, j.id, "2026-10-09T08:00:00Z");
    // Monday 5 October, same week.
    fineAt(db, j.id, "2026-10-05T08:00:00Z");
    // Friday 2 October, the week before.
    fineAt(db, j.id, "2026-10-02T08:00:00Z");
    // Too old for the chart, still counts toward weekdays.
    fineAt(db, j.id, "2026-01-02T08:00:00Z");

    const view = buildStatsView(db, me.id, opts);
    expect(view.weeks.at(-1)).toEqual({ label: "Week of 5 October", count: 3 });
    expect(view.weeks.at(-2)).toEqual({ label: "Week of 28 September", count: 1 });
    expect(view.weeks[0].label).toBe("Week of 20 July");
    expect(view.weeks.reduce((sum, w) => sum + w.count, 0)).toBe(4);
    expect(view.weekdays.map((d) => d.count)).toEqual([1, 0, 0, 0, 4, 0, 0]);
    expect(view.worstDay).toBe("Friday");
    expect(view.weekdays.map((d) => d.worst)).toEqual([false, false, false, false, true, false, false]);
    expect(view.daysSinceLastFine).toBe(2);
    expect(buildStatsView(db, me.id, { ...opts, timeZone: "Pacific/Kiritimati" }).weekdays[5].count).toBe(1);
  });

  it("names no worst day for a tie or too few fines", () => {
    const db = openDatabase(":memory:");
    const me = makeUser(db);
    const j = jar(db, me.id, "Snacks");
    fineAt(db, j.id, "2026-10-09T08:00:00Z");
    fineAt(db, j.id, "2026-10-09T09:00:00Z");
    expect(buildStatsView(db, me.id, opts).worstDay).toBeNull();
    fineAt(db, j.id, "2026-10-08T09:00:00Z");
    fineAt(db, j.id, "2026-10-08T10:00:00Z");
    expect(buildStatsView(db, me.id, opts).worstDay).toBeNull();
    expect(buildStatsView(db, me.id, opts).weekdays.some((d) => d.worst)).toBe(false);
  });

  it("counts today as zero days since the last fine", () => {
    const db = openDatabase(":memory:");
    const me = makeUser(db);
    fineAt(db, jar(db, me.id, "Snacks").id, "2026-10-11T07:00:00Z");
    expect(buildStatsView(db, me.id, opts).daysSinceLastFine).toBe(0);
  });
});
