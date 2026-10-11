import { describe, expect, it } from "vitest";
import { callArgs, getRequest, makeUser, sessionCookieFor } from "../test/helpers";
import { loader } from "./avatar";

describe("/avatar", () => {
  it("is 404 when signed out", async () => {
    expect((await loader(callArgs(getRequest("http://localhost:3000/avatar")))).status).toBe(404);
  });
  it("is 404 for an account without a picture", async () => {
    const user = makeUser();
    expect((await loader(callArgs(getRequest("http://localhost:3000/avatar", await sessionCookieFor(user.id))))).status).toBe(404);
  });
});
