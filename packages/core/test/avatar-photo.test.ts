import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("appwrite", () => {
  class Avatars {
    getPhoto(params: { width?: number; height?: number; userId?: string } = {}) {
      const id = params.userId ?? "current";
      return `https://cloud.appwrite.io/v1/avatars/photo?userId=${id}&width=${params.width ?? 64}&height=${params.height ?? 64}`;
    }
  }
  return {
    Avatars,
    Client: class {},
  };
});

import { Avatars } from "appwrite";
import { avatarPhotoUrl } from "../src/avatar-photo.js";

describe("avatarPhotoUrl", () => {
  const client = {} as import("appwrite").Client;
  const user = { $id: "user-abc" } as import("appwrite").Models.User<
    import("appwrite").Models.Preferences
  >;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a getPhoto URL with the concrete user id and size", () => {
    const url = avatarPhotoUrl(client, user, 64);
    expect(url).toContain("userId=user-abc");
    expect(url).toContain("width=64");
    expect(url).toContain("height=64");
    expect(url).not.toContain("current()");
  });

  it("returns null without a client or user id", () => {
    expect(avatarPhotoUrl(null, user, 64)).toBeNull();
    expect(avatarPhotoUrl(client, null, 64)).toBeNull();
    expect(avatarPhotoUrl(client, { $id: "" } as never, 64)).toBeNull();
  });

  it("soft-detects missing getPhoto on older Avatars", () => {
    const proto = Avatars.prototype as { getPhoto?: unknown };
    const saved = proto.getPhoto;
    delete proto.getPhoto;
    try {
      expect(avatarPhotoUrl(client, user, 64)).toBeNull();
    } finally {
      proto.getPhoto = saved;
    }
  });

  it("returns null when getPhoto throws", () => {
    vi.spyOn(Avatars.prototype, "getPhoto").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(avatarPhotoUrl(client, user, 64)).toBeNull();
  });
});
