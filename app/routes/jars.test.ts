import { describe, expect, it } from "vitest";
import { getDb } from "../lib/db.server";
import { addFine, createJar } from "../lib/jars.server";
import { findUserById } from "../lib/users.server";
import { callArgs, catchResponse, formRequest, getRequest, makeUser, sessionCookieFor } from "../test/helpers";
import { action, loader } from "./jars";

const nbsp = (s: string) => s.replace(/ /g, " ");

describe("dashboard loader", () => {
  it("redirects to / when signed out", async () => {
    expect((await catchResponse(loader(callArgs(getRequest("http://localhost:3000/jars"))))).headers.get("Location")).toBe("/");
  });
  it("lists only my jars with labels in my locale", async () => {
    const me = makeUser(getDb(), "Arslan");
    const other = makeUser();
    const jar = createJar(getDb(), me.id, { title: "Negativity jar", description: "", fineAmount: 100, currency: "EUR", visibility: "private", publicSlug: null });
    addFine(getDb(), jar.id, null);
    createJar(getDb(), other.id, { title: "Not mine", description: "", fineAmount: 100, currency: "EUR", visibility: "public", publicSlug: null });
    const data = await loader(callArgs(getRequest("http://localhost:3000/jars", await sessionCookieFor(me.id), { "Accept-Language": "en-US" })));
    expect(data.jars).toEqual([{ id: jar.id, title: "Negativity jar", countLabel: "1 fine", balanceLabel: "€1.00" }]);
    expect(nbsp(data.subtitle)).toBe("€1.00 owed. Ouch.");
  });
});

describe("dashboard sort", () => {
  it("lists in the account's saved order", async () => {
    const me = makeUser();
    const quiet = createJar(getDb(), me.id, { title: "Quiet", description: "", fineAmount: 100, currency: "EUR", visibility: "private", publicSlug: null });
    const loud = createJar(getDb(), me.id, { title: "Loud", description: "", fineAmount: 100, currency: "EUR", visibility: "private", publicSlug: null });
    addFine(getDb(), quiet.id, null);
    const cookie = await sessionCookieFor(me.id);
    const before = await loader(callArgs(getRequest("http://localhost:3000/jars", cookie)));
    expect(before.sort).toBe("newest");
    expect(before.jars.map((j) => j.id)).toEqual([loud.id, quiet.id]);

    expect(await action(callArgs(formRequest("http://localhost:3000/jars", { intent: "sort", sort: "owed" }, cookie)))).toEqual({ ok: true });
    expect(findUserById(getDb(), me.id)?.jarSort).toBe("owed");
    const after = await loader(callArgs(getRequest("http://localhost:3000/jars", cookie)));
    expect(after.sort).toBe("owed");
    expect(after.jars.map((j) => j.id)).toEqual([quiet.id, loud.id]);
  });
  it("needs a session", async () => {
    const response = await catchResponse(action(callArgs(formRequest("http://localhost:3000/jars", { intent: "sort", sort: "owed" }))));
    expect(response.headers.get("Location")).toBe("/");
  });
  it("rejects unknown orders and intents", async () => {
    const me = makeUser();
    const cookie = await sessionCookieFor(me.id);
    expect(await action(callArgs(formRequest("http://localhost:3000/jars", { intent: "sort", sort: "random" }, cookie)))).toMatchObject({ init: { status: 400 } });
    expect(await action(callArgs(formRequest("http://localhost:3000/jars", { intent: "other", sort: "owed" }, cookie)))).toMatchObject({ init: { status: 400 } });
    expect(findUserById(getDb(), me.id)?.jarSort).toBe("newest");
  });
});
