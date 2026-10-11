import { useEffect, useRef } from "react";
import { Form, Link, useLocation, useRouteLoaderData } from "react-router";
import type { loader as rootLoader } from "../root";
import { Avatar } from "./Avatar";

const ROW = "block w-full px-4 py-3 text-left font-semibold hover:bg-yellow focus-visible:bg-yellow focus-visible:outline-offset-[-6px]";

/**
 * The avatar in the top-right corner, opening Profile and Sign out. Renders nothing when signed out.
 * A plain disclosure, so it opens before JavaScript loads; the script only adds closing on outside click and Escape.
 */
export function AccountMenu() {
  const viewer = useRouteLoaderData<typeof rootLoader>("root")?.viewer;
  const menu = useRef<HTMLDetailsElement>(null);
  const { key } = useLocation();

  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [key]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const el = menu.current;
      if (el?.open && !el.contains(event.target as Node)) el.open = false;
    }
    function onKeyDown(event: KeyboardEvent) {
      const el = menu.current;
      if (event.key !== "Escape" || !el?.open) return;
      el.open = false;
      el.querySelector("summary")?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (!viewer) return null;
  return (
    <details ref={menu} className="group relative">
      <summary
        aria-label="Your account"
        className="block cursor-pointer list-none shadow-[3px_3px_0_#000] transition-[transform,box-shadow] duration-75 group-open:translate-x-[3px] group-open:translate-y-[3px] group-open:shadow-none motion-reduce:transition-none [&::-webkit-details-marker]:hidden"
      >
        <Avatar name={viewer.name} src={viewer.avatarSrc} className="h-11 w-11 text-xl" />
      </summary>
      <div className="panel absolute right-0 top-full z-20 mt-3 w-64 max-w-[calc(100vw-2rem)] shadow-[6px_6px_0_#000]">
        <div className="border-b-3 border-ink px-4 py-3">
          <p className="truncate font-extrabold">{viewer.name}</p>
          {viewer.email && <p className="truncate text-sm">{viewer.email}</p>}
        </div>
        <Link to="/profile" className={ROW}>Profile</Link>
        <Form method="post" action="/logout">
          <button type="submit" className={ROW}>Sign out</button>
        </Form>
      </div>
    </details>
  );
}
