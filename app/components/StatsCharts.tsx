import { Link } from "react-router";
import type { JarStats } from "../lib/stats.server";

/**
 * Flat columns on a white panel, one per bar, with the count on top. The drawing is hidden from
 * screen readers; a visually hidden table carries the same numbers.
 */
export function ColumnChart({ bars, caption, ends }: {
  bars: Array<{ label: string; count: number; highlight?: boolean }>;
  caption: string;
  /** Labels under the first and last column. Without them, every column shows its own label. */
  ends?: [string, string];
}) {
  const max = Math.max(1, ...bars.map((b) => b.count));
  return (
    <figure className="panel px-4 pb-3 pt-4">
      <div aria-hidden="true" className="flex h-40 items-end gap-1.5 border-b-3 border-ink pt-6 sm:gap-2.5">
        {bars.map((bar, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end">
            {bar.count > 0 && (
              <div
                className={`relative border-3 border-b-0 border-ink ${bar.highlight ? "bg-ink" : "bg-pink"}`}
                style={{ height: `max(0.75rem, ${(bar.count / max) * 100}%)` }}
              >
                <span className="tnum absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-xs font-extrabold">{bar.count}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {ends ? (
        <div aria-hidden="true" className="mt-2 flex justify-between text-sm font-semibold">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      ) : (
        <div aria-hidden="true" className="mt-2 flex gap-1.5 text-center text-sm sm:gap-2.5">
          {bars.map((bar, i) => (
            <span key={i} className={`min-w-0 flex-1 truncate ${bar.highlight ? "font-extrabold" : "font-semibold"}`}>{bar.label}</span>
          ))}
        </div>
      )}
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {bars.map((bar, i) => (
            <tr key={i}>
              <th scope="row">{bar.label}</th>
              <td>{bar.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Swatch({ className }: { className: string }) {
  return <span className={`inline-block h-3.5 w-3.5 border-2 border-ink ${className}`} />;
}

export function JarLegend() {
  return (
    <span aria-hidden="true" className="flex items-center gap-4 text-sm font-semibold">
      <span className="flex items-center gap-1.5"><Swatch className="bg-mint" />Settled</span>
      <span className="flex items-center gap-1.5"><Swatch className="bg-pink" />Owed</span>
    </span>
  );
}

function Segment({ count, className }: { count: number; className: string }) {
  return (
    <span className={`tnum flex min-w-8 items-center overflow-hidden border-3 border-ink px-1 text-sm font-extrabold ${className}`} style={{ flex: `${count} 1 0` }}>
      {count}
    </span>
  );
}

/** One bar per jar, as long as its fine count against the busiest jar, split into settled and owed fines. */
export function JarBars({ jars }: { jars: JarStats[] }) {
  const max = Math.max(1, ...jars.map((j) => j.fineCount));
  return (
    <ul className="flex flex-col gap-5">
      {jars.map((jar) => (
        <li key={jar.id} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <Link to={`/jars/${jar.id}`} className="link min-w-0 truncate">{jar.title}</Link>
            <span className="tnum shrink-0 text-sm font-semibold">
              {jar.owedLabel ? `${jar.owedLabel} owed` : jar.fineCount > 0 ? "All settled" : "No fines yet"}
            </span>
          </div>
          {jar.fineCount > 0 && (
            <>
              <div aria-hidden="true" className="flex h-9" style={{ width: `${(jar.fineCount / max) * 100}%` }}>
                {jar.settledCount > 0 && <Segment count={jar.settledCount} className="bg-mint" />}
                {jar.owedCount > 0 && <Segment count={jar.owedCount} className={`bg-pink ${jar.settledCount > 0 ? "border-l-0" : ""}`} />}
              </div>
              <p className="sr-only">{jar.settledCount} settled, {jar.owedCount} owed</p>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
