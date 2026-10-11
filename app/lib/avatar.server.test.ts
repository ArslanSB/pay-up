import { describe, expect, it } from "vitest";
import { avatarSrc, fetchAvatar, sizedAvatarUrl } from "./avatar.server";

const png = (headers: Record<string, string> = {}, status = 200, bytes = 4) =>
  new Response(new Uint8Array(bytes), { status, headers: { "Content-Type": "image/png", ...headers } });

describe("sizedAvatarUrl", () => {
  it("asks Google for a 256px square", () => {
    expect(sizedAvatarUrl("https://lh3.googleusercontent.com/a/ACg8oc=s96-c")?.href).toBe("https://lh3.googleusercontent.com/a/ACg8oc=s256-c");
  });
  it("asks GitHub for 256px and keeps its version", () => {
    expect(sizedAvatarUrl("https://avatars.githubusercontent.com/u/7?v=4")?.href).toBe("https://avatars.githubusercontent.com/u/7?v=4&s=256");
  });
  it("refuses anything that isn't a provider host over https", () => {
    expect(sizedAvatarUrl("https://example.com/me.png")).toBeNull();
    expect(sizedAvatarUrl("http://avatars.githubusercontent.com/u/7")).toBeNull();
    expect(sizedAvatarUrl("https://googleusercontent.com.evil.test/a.png")).toBeNull();
    expect(sizedAvatarUrl("not a url")).toBeNull();
  });
});

describe("avatarSrc", () => {
  it("versions the path by the avatar address", () => {
    const a = avatarSrc("https://avatars.githubusercontent.com/u/7?v=4");
    expect(a).toMatch(/^\/avatar\?v=[0-9a-f]{12}$/);
    expect(avatarSrc("https://avatars.githubusercontent.com/u/8?v=4")).not.toBe(a);
    expect(avatarSrc(null)).toBeNull();
  });
});

describe("fetchAvatar", () => {
  const url = "https://avatars.githubusercontent.com/u/7?v=4";
  it("passes the picture through with a private cache", async () => {
    let asked = "";
    const response = await fetchAvatar(url, async (input) => {
      asked = String(input);
      return png({ "Content-Type": "image/png; charset=binary" });
    });
    expect(asked).toBe("https://avatars.githubusercontent.com/u/7?v=4&s=256");
    expect(response?.status).toBe(200);
    expect(response?.headers.get("Content-Type")).toBe("image/png");
    expect(response?.headers.get("Cache-Control")).toBe("private, max-age=86400");
    expect((await response?.arrayBuffer())?.byteLength).toBe(4);
  });
  it("gives up on errors, non-images, SVG, oversize bodies and off-host redirects", async () => {
    expect(await fetchAvatar(url, async () => png({}, 404))).toBeNull();
    expect(await fetchAvatar(url, async () => png({ "Content-Type": "text/html" }))).toBeNull();
    expect(await fetchAvatar(url, async () => png({ "Content-Type": "image/svg+xml" }))).toBeNull();
    expect(await fetchAvatar(url, async () => png({}, 200, 1_000_001))).toBeNull();
    expect(
      await fetchAvatar(url, async () => {
        const response = png();
        Object.defineProperty(response, "url", { value: "https://example.com/elsewhere.png" });
        return response;
      }),
    ).toBeNull();
    expect(
      await fetchAvatar(url, async () => {
        throw new Error("offline");
      }),
    ).toBeNull();
    expect(await fetchAvatar("https://example.com/me.png", async () => png())).toBeNull();
  });
});
