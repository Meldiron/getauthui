import { afterEach, describe, expect, it, vi } from "vitest";
import { checkPwnedPassword, PwnedPasswordChecker, sha1Hex } from "../src/pwned-password.js";

describe("sha1Hex", () => {
  it("hashes Password1! to the known SHA-1", async () => {
    expect(await sha1Hex("Password1!")).toBe("32CA9FC1A0F5B6330E3F4C8C1BBECDE9BEDB9573");
  });
});

describe("checkPwnedPassword", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports pwned when the suffix is listed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => "FC1A0F5B6330E3F4C8C1BBECDE9BEDB9573:584516\nAABBCC:1\n",
      }))
    );
    await expect(checkPwnedPassword("Password1!")).resolves.toBe("pwned");
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledOnce();
    const url = String(fetchMock.mock.calls[0]![0]);
    expect(url).toContain("/range/32CA9");
    expect(url).not.toContain("Password1!");
  });

  it("reports clear when the suffix is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => "DEADBEEF:1\n",
      }))
    );
    await expect(checkPwnedPassword("Password1!")).resolves.toBe("clear");
  });

  it("reports unavailable on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      })
    );
    await expect(checkPwnedPassword("Password1!")).resolves.toBe("unavailable");
  });

  it("reports unavailable on non-OK responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        text: async () => "",
      }))
    );
    await expect(checkPwnedPassword("Password1!")).resolves.toBe("unavailable");
  });
});

describe("PwnedPasswordChecker", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("debounces and sets pwned on a hit", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => "FC1A0F5B6330E3F4C8C1BBECDE9BEDB9573:10\n",
      }))
    );
    const updates: boolean[] = [];
    const checker = new PwnedPasswordChecker(() => updates.push(checker.pwned), 50);
    checker.schedule("Password1!");
    expect(checker.checking).toBe(true);
    expect(checker.pwned).toBe(false);
    await vi.advanceTimersByTimeAsync(50);
    await Promise.resolve();
    await Promise.resolve();
    expect(checker.pwned).toBe(true);
    expect(checker.checking).toBe(false);
    expect(updates.includes(true)).toBe(true);
  });
});
