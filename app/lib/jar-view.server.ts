import { fineCountLabel } from "./copy";
import { formatDate, formatDayTime, formatTime, groupByDay } from "./dates";
import type { Db } from "./db.server";
import { getBalance, getHistory, type Jar } from "./jars.server";
import { formatMoney } from "./money";
import type { JarView } from "./view-types";

export const FINE_PAGE = 10;
const MAX_FINE_LIMIT = 10_000;

/** `?fines=` from the URL: a whole number of pages, at least one. */
export function parseFineLimit(url: string): number {
  const raw = Number(new URL(url).searchParams.get("fines"));
  if (!Number.isFinite(raw) || raw <= FINE_PAGE) return FINE_PAGE;
  return Math.min(MAX_FINE_LIMIT, Math.ceil(raw / FINE_PAGE) * FINE_PAGE);
}

export function buildJarView(db: Db, jar: Jar, opts: { now: Date; timeZone: string; locale: string; fineLimit?: number }): JarView {
  const { now, timeZone, locale, fineLimit = FINE_PAGE } = opts;
  const money = (minor: number) => formatMoney(minor, jar.currency, locale);
  const balance = getBalance(db, jar.id);
  const history = getHistory(db, jar.id);
  const shown = history.unsettled.slice(0, fineLimit);
  const hidden = history.unsettled.length - shown.length;
  return {
    jar: {
      id: jar.id,
      title: jar.title,
      description: jar.description,
      visibility: jar.visibility,
      publicSlug: jar.publicSlug,
      fineAmountLabel: money(jar.fineAmount),
      currency: jar.currency,
    },
    balance,
    balanceLabel: money(balance.total),
    groups: groupByDay(shown, now, timeZone, locale).map((g) => ({
      label: g.label,
      fines: g.items.map((t) => ({ id: t.id, timeLabel: formatTime(t.createdAt, timeZone, locale), note: t.note, amountLabel: money(t.amount) })),
    })),
    more: hidden > 0 ? { count: Math.min(FINE_PAGE, hidden), hidden, limit: fineLimit + FINE_PAGE } : null,
    settlements: history.settlements.map((s) => ({
      id: s.id,
      label: `Settled ${formatDate(s.createdAt, now, timeZone, locale)}`,
      summary: s.note ? `${fineCountLabel(s.fineCount)}, ${s.note}` : fineCountLabel(s.fineCount),
      totalLabel: money(s.total),
      fines: s.fines.map((f) => ({ id: f.id, whenLabel: formatDayTime(f.createdAt, now, timeZone, locale), note: f.note, amountLabel: money(f.amount) })),
    })),
    newestFineId: history.unsettled[0]?.id ?? null,
  };
}
