import type { Route } from "./+types/avatar";
import { fetchAvatar } from "../lib/avatar.server";
import { getDb } from "../lib/db.server";
import { getUser } from "../lib/session.server";

/** GET /avatar: the signed-in user's own provider picture. 404 when there is none, so the page shows the initial. */
export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request, getDb());
  const picture = user?.avatarUrl ? await fetchAvatar(user.avatarUrl) : null;
  return picture ?? new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}
