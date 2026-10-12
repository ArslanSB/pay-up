import type { Visibility } from "./jars.server";

export interface FineRow {
  id: string;
  timeLabel: string;
  note: string | null;
  amountLabel: string;
}

export interface DayGroup {
  label: string;
  fines: FineRow[];
}

export interface PaidFineRow {
  id: string;
  whenLabel: string;
  note: string | null;
  amountLabel: string;
}

export interface SettlementRow {
  id: string;
  label: string;
  summary: string;
  totalLabel: string;
  /** The fines this settle-up paid, newest first. */
  fines: PaidFineRow[];
}

/** The next page of unsettled fines: `count` more of `hidden`, reached at `?fines=limit`. */
export interface MoreFines {
  count: number;
  hidden: number;
  limit: number;
}

export interface JarView {
  jar: {
    id: string;
    title: string;
    description: string;
    visibility: Visibility;
    publicSlug: string;
    fineAmountLabel: string;
    currency: string;
  };
  balance: { total: number; count: number };
  balanceLabel: string;
  /** The newest unsettled fines, up to the requested limit. */
  groups: DayGroup[];
  more: MoreFines | null;
  settlements: SettlementRow[];
  newestFineId: string | null;
}
