import { vi } from "vitest";

/** In-memory stand-in for the Appwrite Account service. */
export function createAccountMock() {
  const state = {
    user: null as null | Record<string, unknown>,
    mfaPending: false,
    blocked: false,
  };
  const err = (type: string, code = 401) => Object.assign(new Error(type), { type, code });

  const mock = {
    state,
    get: vi.fn(async () => {
      if (state.mfaPending) throw err("user_more_factors_required");
      if (state.blocked) throw err("user_blocked");
      if (!state.user) throw err("general_unauthorized_scope");
      return state.user;
    }),
    createEmailPasswordSession: vi.fn(async (email: string, password: string) => {
      if (password !== "correct-horse") throw err("user_invalid_credentials");
      state.user = {
        $id: "u1",
        email,
        name: "Test",
        mfa: false,
        emailVerification: true,
        phoneVerification: false,
        phone: "",
      };
      return { $id: "s1" };
    }),
    create: vi.fn(async (_id: string, email: string) => ({ $id: "u2", email })),
    createAnonymousSession: vi.fn(async () => {
      state.user = { $id: "guest", email: "", phone: "", name: "" };
      return { $id: "s2" };
    }),
    createSession: vi.fn(async (userId: string, secret: string) => {
      if (secret !== "valid-secret") throw err("user_invalid_token");
      state.user = { $id: userId, email: "token@example.com", name: "", phone: "" };
      return { $id: "s3" };
    }),
    createMagicURLToken: vi.fn(async (userId: string) => ({
      userId,
      secret: "",
      phrase: "brave-otter",
    })),
    createEmailToken: vi.fn(async (userId: string) => ({ userId, secret: "", phrase: "calm-fox" })),
    createPhoneToken: vi.fn(async (userId: string) => ({ userId, secret: "", phrase: "" })),
    createOAuth2Token: vi.fn(),
    createRecovery: vi.fn(async () => ({})),
    updateRecovery: vi.fn(async () => ({})),
    updateEmailVerification: vi.fn(async () => ({})),
    listMFAFactors: vi.fn(async () => ({
      totp: true,
      email: true,
      phone: false,
      recoveryCode: true,
    })),
    createMFAChallenge: vi.fn(async () => ({ $id: "c1" })),
    updateMFAChallenge: vi.fn(async (_id: string, otp: string) => {
      if (otp !== "123456") throw err("user_invalid_token");
      state.mfaPending = false;
      return { $id: "s1" };
    }),
    deleteSession: vi.fn(async (sessionId = "current") => {
      // Only the current session clears the local user (mirrors real Appwrite).
      if (sessionId === "current" || sessionId === "s1") {
        state.user = null;
        state.mfaPending = false;
      }
      return {};
    }),
    deleteSessions: vi.fn(async () => {
      state.user = null;
      return {};
    }),
    listSessions: vi.fn(async () => ({
      sessions: [
        { $id: "s1", current: true, clientName: "Chrome", osName: "macOS", provider: "email" },
      ],
    })),
    listIdentities: vi.fn(async () => ({ identities: [] })),
    listLogs: vi.fn(async () => {
      throw err("general_route_not_found", 404);
    }),
    updateName: vi.fn(async (name: string) => {
      state.user = { ...state.user!, name };
      return state.user;
    }),
    updateMFA: vi.fn(async (mfa: boolean) => {
      state.user = { ...state.user!, mfa };
      return state.user;
    }),
    createMFAAuthenticator: vi.fn(async () => ({ secret: "ABCDEF", uri: "otpauth://totp/x" })),
    updateMFAAuthenticator: vi.fn(async () => ({})),
    createMFARecoveryCodes: vi.fn(async () => ({ recoveryCodes: ["aaaa-bbbb", "cccc-dddd"] })),
  };
  return mock;
}

export type AccountMock = ReturnType<typeof createAccountMock>;

/** Mock the `appwrite` package so no network is touched. Returns the shared account mock. */
export function mockAppwrite() {
  const account = createAccountMock();
  vi.doMock("appwrite", () => ({
    Client: class {
      setEndpoint() {
        return this;
      }
      setProject() {
        return this;
      }
    },
    Account: class {
      constructor() {
        return account;
      }
    },
    Avatars: class {
      getQR(text: string) {
        return `https://example.com/qr?text=${encodeURIComponent(text)}`;
      }
    },
    ID: { unique: () => "unique()" },
  }));
  return account;
}

export const config = {
  endpoint: "https://cloud.appwrite.io/v1",
  project: "test-project",
  methods: {
    emailPassword: true,
    magicUrl: true,
    emailOtp: true,
    phone: true,
    anonymous: true,
    oauth: ["google", "github"] as ("google" | "github")[],
  },
  branding: { name: "Acme" },
};

export const tick = () => new Promise((r) => setTimeout(r, 0));
