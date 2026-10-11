import { Fragment } from "react";
import { data, Form, Link } from "react-router";
import type { Route } from "./+types/profile";
import { AccountMenu } from "../components/AccountMenu";
import { Avatar } from "../components/Avatar";
import { ConfirmButton } from "../components/ConfirmButton";
import { ColumnChart, JarBars, JarLegend } from "../components/StatsCharts";
import { avatarSrc } from "../lib/avatar.server";
import { fineCountLabel, jarCountLabel, lastFineLabel } from "../lib/copy";
import { getDb } from "../lib/db.server";
import { env } from "../lib/env.server";
import { destroyUserSession, requireUser } from "../lib/session.server";
import { buildStatsView, type StatsView } from "../lib/stats.server";
import { deleteUser } from "../lib/users.server";
import { getLocale, getTimeZone } from "../lib/viewer.server";

export function meta() {
  return [{ title: "Profile" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const db = getDb();
  const user = await requireUser(request, db);
  const stats = buildStatsView(db, user.id, { now: new Date(), timeZone: getTimeZone(request), locale: getLocale(request, env().appLocale) });
  return {
    name: user.name,
    email: user.email,
    provider: user.provider === "google" ? "Google" : "GitHub",
    avatarSrc: avatarSrc(user.avatarUrl),
    stats,
  };
}

/** POST intent=delete: erase the account and everything in it, then sign out. */
export async function action({ request }: Route.ActionArgs) {
  const db = getDb();
  const user = await requireUser(request, db);
  const form = await request.formData();
  if (form.get("intent") !== "delete") return data({ error: "Unknown action." }, { status: 400 });
  deleteUser(db, user.id);
  return destroyUserSession(request, "/?deleted=1");
}

/** "€4.00", "€4.00 and US$2.50": each amount on a chip in the colour that means owed or settled everywhere else. */
function Amounts({ labels, className }: { labels: string[]; className: string }) {
  return (
    <>
      {new Intl.ListFormat("en", { type: "conjunction" }).formatToParts(labels).map((part, i) =>
        part.type === "element" ? (
          <b key={i} className={`tnum whitespace-nowrap border-3 border-ink px-1.5 ${className}`}>{part.value}</b>
        ) : (
          <Fragment key={i}>{part.value}</Fragment>
        ),
      )}
    </>
  );
}

function Summary({ stats }: { stats: StatsView }) {
  const lead = "display text-[28px] leading-[1.35] sm:text-[32px]";
  if (stats.jarCount === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className={lead}>No jars yet.</p>
        <Link to="/jars/new" className="btn btn-pink raised">New jar</Link>
      </div>
    );
  }
  if (stats.fineCount === 0) return <p className={lead}>{jarCountLabel(stats.jarCount)}, no fines yet.</p>;
  const settled = <Amounts labels={stats.settled} className="bg-mint" />;
  const owed = <Amounts labels={stats.owed} className="bg-pink" />;
  return (
    <div className="flex flex-col gap-3">
      <p className={`${lead} max-w-[24ch]`}>
        {fineCountLabel(stats.fineCount)} across {jarCountLabel(stats.jarCount)}.{" "}
        {stats.settled.length > 0 && stats.owed.length > 0 && <>{settled} settled, {owed} still owed.</>}
        {stats.settled.length > 0 && stats.owed.length === 0 && <>{settled} settled, nothing owed.</>}
        {stats.settled.length === 0 && <>Nothing settled yet, {owed} owed.</>}
      </p>
      {stats.daysSinceLastFine !== null && <p className="text-lg font-semibold">{lastFineLabel(stats.daysSinceLastFine)}</p>}
    </div>
  );
}

export default function Profile({ loaderData }: Route.ComponentProps) {
  const { name, email, provider, stats } = loaderData;
  return (
    <main className="flex flex-col gap-6">
      <nav className="flex items-center justify-between font-semibold">
        <Link to="/jars" className="link">‹ Jars</Link>
        <AccountMenu />
      </nav>
      <header className="flex items-end gap-5">
        <Avatar name={name} src={loaderData.avatarSrc} className="sticker h-24 w-24 text-5xl shadow-[6px_6px_0_#000]" />
        <h1 className="display min-w-0 text-[46px] [overflow-wrap:anywhere]">{name}</h1>
      </header>
      <Summary stats={stats} />

      {stats.fineCount > 0 && (
        <>
          <section className="mt-4 flex flex-col gap-3">
            <h2 className="text-xl font-extrabold">Fines per week</h2>
            <ColumnChart bars={stats.weeks} caption={`Fines per week, last ${stats.weeks.length} weeks`} ends={[`${stats.weeks.length} weeks ago`, "This week"]} />
          </section>
          <section className="mt-4 flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-xl font-extrabold">Fines per jar</h2>
              <JarLegend />
            </div>
            <JarBars jars={stats.jars} />
          </section>
          <section className="mt-4 flex flex-col gap-3">
            <h2 className="text-xl font-extrabold">{stats.worstDay ? `Your worst day is ${stats.worstDay}.` : "Fines per day of the week"}</h2>
            <ColumnChart bars={stats.weekdays.map((d) => ({ label: d.label, count: d.count, highlight: d.worst }))} caption="Fines per day of the week" />
          </section>
        </>
      )}

      <section className="mt-10 flex flex-col items-start gap-3">
        <h2 className="text-xl font-extrabold">Account</h2>
        <p>Signed in with {provider}{email ? <> as <b>{email}</b></> : null}.</p>
        <Form method="post" action="/logout"><button type="submit" className="btn btn-ghost raised">Sign out</button></Form>
        <p className="mt-4 text-sm">Deleting the account removes every jar, fine and settlement in it. There is no undo.</p>
        <ConfirmButton intent="delete" label="Delete my account" confirmLabel="Yes, delete everything" message="This erases your account and all of its jars. There is no undo." />
      </section>
    </main>
  );
}
