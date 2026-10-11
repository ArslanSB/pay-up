import { describe, expect, it } from "vitest";
import { getDb } from "../lib/db.server";
import { addFine, createJar, settle } from "../lib/jars.server";
import { findUserById, upsertUser } from "../lib/users.server";
import { callArgs, catchResponse, formRequest, getRequest, makeUser, sessionCookieFor } from "../test/helpers";
import { action, loader, meta } from "./profile";

const nbsp = (s: string) => s.replace(/ /g, " ");

describe("/profile loader", () => {
  it("redirects to / when signed out", async () => {
    expect((await catchResponse(loader(callArgs(getRequest("http://localhost:3000/profile"))))).headers.get("Location")).toBe("/");
  });
  it("shows who I am and the stats of my own jars only", async () => {
    const me = upsertUser(getDb(), { provider: "google", providerId: `profile-${Date.now()}`, email: "ada@x.y", name: "Ada", avatarUrl: "https://lh3.googleusercontent.com/a/x=s96-c" });
    const jar = createJar(getDb(), me.id, { title: "Doom jar", description: "", fineAmount: 100, currency: "EUR", visibility: "private", publicSlug: null });
    addFine(getDb(), jar.id, null);
    settle(getDb(), jar.id, null);
    addFine(getDb(), jar.id, null);
    createJar(getDb(), makeUser().id, { title: "Not mine", description: "", fineAmount: 100, currency: "EUR", visibility: "private", publicSlug: null });

    const data = await loader(callArgs(getRequest("http://localhost:3000/profile", await sessionCookieFor(me.id), { "Accept-Language": "en-US" })));
    expect(data).toMatchObject({ name: "Ada", email: "ada@x.y", provider: "Google" });
    expect(data.avatarSrc).toMatch(/^\/avatar\?v=/);
    expect(data.stats).toMatchObject({ jarCount: 1, fineCount: 2, daysSinceLastFine: 0 });
    expect(data.stats.owed.map(nbsp)).toEqual(["€1.00"]);
    expect(data.stats.settled.map(nbsp)).toEqual(["€1.00"]);
    expect(data.stats.jars).toMatchObject([{ id: jar.id, settledCount: 1, owedCount: 1 }]);
  });
  it("has a title", () => {
    expect(meta()).toContainEqual({ title: "Profile" });
  });
});

describe("/profile action", () => {
  it("delete needs a session", async () => {
    const response = await catchResponse(action(callArgs(formRequest("http://localhost:3000/profile", { intent: "delete" }))));
    expect(response.headers.get("Location")).toBe("/");
  });
  it("delete removes the user and their jars, clears the session and lands on the goodbye landing", async () => {
    const user = makeUser();
    createJar(getDb(), user.id, { title: "Doom jar", description: "", fineAmount: 100, currency: "EUR", visibility: "private", publicSlug: null });
    const response = (await action(callArgs(formRequest("http://localhost:3000/profile", { intent: "delete" }, await sessionCookieFor(user.id))))) as Response;
    expect(response.headers.get("Location")).toBe("/?deleted=1");
    expect(response.headers.get("Set-Cookie")).toMatch(/__session=;|Max-Age=0|Expires=/);
    expect(findUserById(getDb(), user.id)).toBeNull();
    expect(getDb().prepare("SELECT COUNT(*) FROM jars WHERE owner_id = ?").pluck().get(user.id)).toBe(0);
  });
  it("rejects other intents", async () => {
    const user = makeUser();
    const result = await action(callArgs(formRequest("http://localhost:3000/profile", { intent: "explode" }, await sessionCookieFor(user.id))));
    expect(result).toMatchObject({ init: { status: 400 } });
    expect(findUserById(getDb(), user.id)).not.toBeNull();
  });
});
