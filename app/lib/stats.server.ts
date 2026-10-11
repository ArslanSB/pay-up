import { dayKey, daysBetweenKeys, shiftKey, weekdayIndex, weekStartKey } from "./dates";
import type { Db } from "./db.server";
import { formatMoney } from "./money";

export const WEEKS = 12;

export interface JarStats {
  id: string;
  title: string;
  fineCount: number;
  settledCount: number;
  owedCount: number;
  /** Null when nothing is owed in this jar. */
  owedLabel: string | null;
}

export interface StatsView {
  jarCount: number;
  fineCount: number;
  /** One label per currency that has something owed, in dashboard order. */
  owed: string[];
  /** One label per currency that has something settled, in dashboard order. */
  settled: string[];
  /** Null when there are no fines. */
  daysSinceLastFine: number | null;
  /** The last WEEKS weeks, oldest first, Monday to Sunday in the viewer's timezone. */
  weeks: Array<{ label: string; count: number }>;
  /** Monday first; `worst` marks the worstDay. */
  weekdays: Array<{ label: string; count: number; worst: boolean }>;
  /** Long weekday name when one day clearly leads; null otherwise. */
  worstDay: string | null;
  /** Most fines first. */
  jars: JarStats[];
}

interface JarRow {
  id: string;
  title: string;
  currency: string;
}

interface FineRow {
  jar_id: string;
  amount: number;
  settled: 0 | 1;
  created_at: string;
}

/** Below this many fines there is no pattern yet, so no worst day is named. */
const WORST_DAY_MIN_FINES = 3;

// 2024-01-01 was a Monday.
const weekdayName = (index: number, locale: string, weekday: "short" | "long") =>
  new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday }).format(new Date(Date.UTC(2024, 0, 1 + index)));

const keyLabel = (key: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(`${key}T00:00:00Z`));

export function buildStatsView(db: Db, ownerId: string, opts: { now: Date; timeZone: string; locale: string }): StatsView {
  const { now, timeZone, locale } = opts;
  const jarRows = db
    .prepare<[string], JarRow>("SELECT id, title, currency FROM jars WHERE owner_id = ? ORDER BY created_at DESC, rowid DESC")
    .all(ownerId);
  const fines = db
    .prepare<[string], FineRow>(
      `SELECT f.jar_id, f.amount, f.settlement_id IS NOT NULL AS settled, f.created_at
       FROM fines f JOIN jars j ON j.id = f.jar_id
       WHERE j.owner_id = ?`,
    )
    .all(ownerId);

  const jars = new Map(jarRows.map((j) => [j.id, { ...j, settledCount: 0, owedCount: 0, owedTotal: 0 }]));
  const money = new Map<string, { owed: number; settled: number }>(jarRows.map((j) => [j.currency, { owed: 0, settled: 0 }]));
  const today = dayKey(now, timeZone);
  const firstWeek = shiftKey(weekStartKey(today), -7 * (WEEKS - 1));
  const weekCounts = new Map<string, number>();
  const weekdayCounts = Array<number>(7).fill(0);
  let lastKey: string | null = null;

  for (const fine of fines) {
    const jar = jars.get(fine.jar_id);
    if (!jar) continue;
    const totals = money.get(jar.currency);
    if (fine.settled) {
      jar.settledCount += 1;
      if (totals) totals.settled += fine.amount;
    } else {
      jar.owedCount += 1;
      jar.owedTotal += fine.amount;
      if (totals) totals.owed += fine.amount;
    }
    const key = dayKey(new Date(fine.created_at), timeZone);
    const week = weekStartKey(key);
    if (week >= firstWeek) weekCounts.set(week, (weekCounts.get(week) ?? 0) + 1);
    weekdayCounts[weekdayIndex(key)] += 1;
    if (!lastKey || key > lastKey) lastKey = key;
  }

  const top = Math.max(...weekdayCounts);
  const worst = fines.length >= WORST_DAY_MIN_FINES && weekdayCounts.filter((c) => c === top).length === 1 ? weekdayCounts.indexOf(top) : -1;
  const currencies = [...money.entries()];

  return {
    jarCount: jarRows.length,
    fineCount: fines.length,
    owed: currencies.filter(([, t]) => t.owed > 0).map(([c, t]) => formatMoney(t.owed, c, locale)),
    settled: currencies.filter(([, t]) => t.settled > 0).map(([c, t]) => formatMoney(t.settled, c, locale)),
    daysSinceLastFine: lastKey ? Math.max(0, daysBetweenKeys(lastKey, today)) : null,
    weeks: Array.from({ length: WEEKS }, (_, i) => {
      const week = shiftKey(firstWeek, 7 * i);
      return { label: `Week of ${keyLabel(week, locale)}`, count: weekCounts.get(week) ?? 0 };
    }),
    weekdays: weekdayCounts.map((count, i) => ({ label: weekdayName(i, locale, "short"), count, worst: i === worst })),
    worstDay: worst >= 0 ? weekdayName(worst, locale, "long") : null,
    jars: [...jars.values()]
      .map((j) => ({
        id: j.id,
        title: j.title,
        fineCount: j.settledCount + j.owedCount,
        settledCount: j.settledCount,
        owedCount: j.owedCount,
        owedLabel: j.owedTotal > 0 ? formatMoney(j.owedTotal, j.currency, locale) : null,
      }))
      // Array.prototype.sort is stable, so ties keep dashboard order.
      .sort((a, b) => b.fineCount - a.fineCount),
  };
}
