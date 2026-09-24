import { Avatars, type Client, type Models } from "appwrite";

/**
 * Build an Appwrite avatars.getPhoto URL for a signed-in user.
 *
 * Passes the concrete user id (not `current()`) so the LOCATION request can
 * resolve OAuth / Gravatar / initials from the project DB with only the
 * project query param the SDK puts on the URL. That matters when Auth UI runs
 * on an arbitrary origin and the session lives in cookieFallback (localStorage),
 * which an `<img src>` cannot send.
 *
 * Soft-detects `getPhoto` so older peer SDKs (peers allow appwrite >=20) fall
 * back to null / initials instead of throwing.
 */
export function avatarPhotoUrl(
  client: Client | null | undefined,
  user: Pick<Models.User<Models.Preferences>, "$id"> | null | undefined,
  size = 64
): string | null {
  if (!client || !user?.$id) return null;
  try {
    const avatars = new Avatars(client) as Avatars & {
      getPhoto?: (params?: {
        width?: number;
        height?: number;
        quality?: number;
        output?: string;
        rating?: string;
        userId?: string;
        emailHash?: string;
        name?: string;
      }) => string;
    };
    // Keep the method call on the instance so `this.client` stays bound.
    if (typeof avatars.getPhoto !== "function") return null;
    const url = avatars.getPhoto({
      width: size,
      height: size,
      userId: user.$id,
    });
    return typeof url === "string" ? url : String(url);
  } catch {
    return null;
  }
}
