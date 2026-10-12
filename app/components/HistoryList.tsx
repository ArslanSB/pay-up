import { Fragment } from "react";
import { Link, useFetcher, useLocation, useNavigation } from "react-router";
import type { DayGroup, MoreFines, SettlementRow } from "../lib/view-types";

function FineDelete({ fineId, label }: { fineId: string; label: string }) {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="post" className="col-start-2 col-end-4">
      <input type="hidden" name="intent" value="undo" />
      <input type="hidden" name="fineId" value={fineId} />
      <button type="submit" className="link text-sm text-blue">{label}</button>
    </fetcher.Form>
  );
}

const finesLabel = (n: number) => (n === 1 ? "fine" : "fines");

/** A link, so it works without JavaScript; `?fines=` asks the loader for one more page. */
function ShowOlder({ more }: { more: MoreFines }) {
  const navigation = useNavigation();
  const { pathname } = useLocation();
  const loading = navigation.state === "loading" && navigation.location.pathname === pathname;
  const label =
    more.count === more.hidden
      ? `Show ${more.hidden} older ${finesLabel(more.hidden)}`
      : `Show ${more.count} of ${more.hidden} older ${finesLabel(more.hidden)}`;
  return (
    <Link to={`?fines=${more.limit}`} preventScrollReset replace className="dashed flex min-h-11 items-center justify-center px-3 py-2 text-center font-extrabold">
      {loading ? "Loading older fines…" : label}
    </Link>
  );
}

/** The mint settle-up row opens like a receipt onto the fines it paid. */
function Settlement({ settlement }: { settlement: SettlementRow }) {
  const row = (
    <>
      <span className="min-w-0 flex-1">{settlement.summary}</span>
      <b className="tnum">{settlement.totalLabel}</b>
    </>
  );
  if (settlement.fines.length === 0) {
    return <div className="panel flex justify-between gap-3 bg-mint px-3.5 py-3 font-semibold">{row}</div>;
  }
  return (
    <details className="group panel">
      <summary className="flex cursor-pointer list-none items-center gap-3 bg-mint px-3.5 py-3 font-semibold focus-visible:outline-offset-[-6px] [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-ink bg-white font-extrabold leading-none">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
        {row}
      </summary>
      {/* One grid for every line, so dates of different widths keep the notes in a column. */}
      <ul className="grid grid-cols-[auto_1fr_auto] gap-x-3 border-t-3 border-ink px-3.5 text-sm">
        {settlement.fines.map((fine) => (
          <li key={fine.id} className="col-span-3 grid grid-cols-subgrid items-baseline border-b-2 border-dashed border-ink py-2.5 last:border-b-0">
            <time className="tnum font-bold">{fine.whenLabel}</time>
            <span className={fine.note ? "" : "text-muted"}>{fine.note ?? "no note"}</span>
            <span className="tnum font-semibold">{fine.amountLabel}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function HistoryList({ groups, more, settlements, canEdit, newestFineId }: {
  groups: DayGroup[];
  more: MoreFines | null;
  settlements: SettlementRow[];
  canEdit: boolean;
  newestFineId: string | null;
}) {
  if (groups.length === 0 && settlements.length === 0) {
    return <p className="font-semibold">Nothing in the jar yet.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <Fragment key={group.label}>
          <p className="mt-2 text-sm font-semibold">{group.label}</p>
          {group.fines.map((fine) => (
            <div key={fine.id} className="panel grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3.5 py-3">
              <time className="tnum font-extrabold">{fine.timeLabel}</time>
              <span className={fine.note ? "" : "text-muted"}>{fine.note ?? "no note"}</span>
              <b className="tnum">{fine.amountLabel}</b>
              {canEdit && <FineDelete fineId={fine.id} label={fine.id === newestFineId ? "Undo" : "Delete"} />}
            </div>
          ))}
        </Fragment>
      ))}
      {more && <ShowOlder more={more} />}
      {settlements.map((s) => (
        <Fragment key={s.id}>
          <p className="mt-2 text-sm font-semibold">{s.label}</p>
          <Settlement settlement={s} />
        </Fragment>
      ))}
    </div>
  );
}
