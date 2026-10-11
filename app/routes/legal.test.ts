import { describe, expect, it } from "vitest";
import { getDb } from "../lib/db.server";
import { upsertUser } from "../lib/users.server";
import { callArgs, getRequest, sessionCookieFor } from "../test/helpers";
import { loader as privacyLoader, meta as privacyMeta } from "./privacy";
import { loader as termsLoader, meta as termsMeta } from "./terms";

describe("legal pages", () => {
  it("expose the operator identity and the date to the page", async () => {
    for (const loader of [termsLoader, privacyLoader]) {
      const data = await loader(callArgs(getRequest("http://localhost:3000/terms")));
      expect(data).toMatchObject({ operatorName: "[operator name not set]", contactEmail: null, appUrl: "http://localhost:3000" });
      expect(data.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("have titles", () => {
    expect(termsMeta()).toContainEqual({ title: "Terms of Service" });
    expect(privacyMeta()).toContainEqual({ title: "Privacy Policy" });
  });
});

describe("root loader", () => {
  it("exposes the operator identity for the footer and no viewer when signed out", async () => {
    const { loader } = await import("../root");
    expect(await loader(callArgs(getRequest("http://localhost:3000/")))).toEqual({ operatorName: "[operator name not set]", contactEmail: null, viewer: null });
  });
  it("exposes the signed-in viewer for the account menu", async () => {
    const { loader } = await import("../root");
    const user = upsertUser(getDb(), { provider: "google", providerId: "root-viewer", email: "ada@x.y", name: "Ada", avatarUrl: "https://lh3.googleusercontent.com/a/x=s96-c" });
    const { viewer } = await loader(callArgs(getRequest("http://localhost:3000/", await sessionCookieFor(user.id))));
    expect(viewer).toEqual({ name: "Ada", email: "ada@x.y", avatarSrc: expect.stringMatching(/^\/avatar\?v=/) });
  });
});
