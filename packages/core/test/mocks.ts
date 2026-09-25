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
    createRecoveryOTP: vi.fn(async (email: string) => ({
      userId: "u-recovery",
      secret: "",
      phrase: "brave-otter",
      email,
    })),
    updateRecoveryOTP: vi.fn(async () => ({})),
    updateEmailVerification: vi.fn(async () => ({})),
    createEmailVerificationOTP: vi.fn(async () => ({
      userId: "u1",
      secret: "",
      phrase: "calm-fox",
    })),
    updateEmailVerificationOTP: vi.fn(async () => {
      if (state.user) state.user = { ...state.user, emailVerification: true };
      return {};
    }),
    createIdTokenSession: vi.fn(async (params: { provider: string }) => {
      state.user = {
        $id: "u-idtoken",
        email: "idtoken@example.com",
        name: "",
        phone: "",
        provider: params.provider,
      };
      return { $id: "s-idtoken" };
    }),
    listConsents: vi.fn(async () => {
      throw err("general_route_not_found", 404);
    }),
    deleteConsent: vi.fn(async () => ({})),
    listConsentTokens: vi.fn(async () => ({ total: 0, tokens: [] })),
    deleteConsentToken: vi.fn(async () => ({})),
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
        {
          $id: "s1",
          current: true,
          clientName: "Chrome",
          clientCode: "ch",
          clientVersion: "120.0",
          osName: "macOS",
          osCode: "mac",
          deviceName: "desktop",
          countryName: "Canada",
          countryCode: "ca",
          ip: "1.2.3.4",
          provider: "email",
          factors: ["password", "totp"],
          $createdAt: "2026-01-01T00:00:00.000Z",
          expire: "2027-01-01T00:00:00.000Z",
        },
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
    getMFARecoveryCodes: vi.fn(async () => ({ recoveryCodes: ["aaaa-bbbb", "cccc-dddd"] })),
    updateMFARecoveryCodes: vi.fn(async () => ({ recoveryCodes: ["eeee-ffff", "gggg-hhhh"] })),
    createEmailVerification: vi.fn(async () => ({})),
    createVerification: vi.fn(async () => ({})),
    createPhoneVerification: vi.fn(async () => ({})),
    updatePhoneVerification: vi.fn(async () => ({})),
    updatePassword: vi.fn(async () => ({})),
  };
  return mock;
}

export type AccountMock = ReturnType<typeof createAccountMock>;

/** Mock the `appwrite` package so no network is touched. Returns the shared account mock. */
export function mockAppwrite() {
  const account = createAccountMock();
  const clientCall = vi.fn(async (_method: string, _uri: URL) => ({}));
  (account as AccountMock & { clientCall: typeof clientCall }).clientCall = clientCall;
  vi.doMock("appwrite", () => ({
    Client: class {
      config = { endpoint: "", project: "" };
      setEndpoint(endpoint: string) {
        this.config.endpoint = endpoint;
        return this;
      }
      setProject(project: string) {
        this.config.project = project;
        return this;
      }
      call = clientCall;
    },
    Teams: class {
      list = vi.fn(async () => ({ teams: [] }));
      create = vi.fn(async ({ teamId, name }: { teamId: string; name: string }) => ({
        $id: teamId,
        name,
        total: 1,
      }));
      listMemberships = vi.fn(async () => ({ memberships: [] }));
      createMembership = vi.fn(async () => ({ $id: "m1", confirm: false }));
      deleteMembership = vi.fn(async () => ({}));
      updateMembershipStatus = vi.fn(async () => ({
        $id: "m1",
        teamId: "t1",
        teamName: "Acme",
        confirm: true,
      }));
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
      getBrowser(code: string) {
        return `https://example.com/browser/${code}.png`;
      }
      getFlag(code: string) {
        return `https://example.com/flag/${code}.png`;
      }
      getPhoto(params: { width?: number; height?: number; userId?: string } = {}) {
        const id = params.userId ?? "current";
        const w = params.width ?? 64;
        const h = params.height ?? 64;
        return `https://example.com/photo/${id}?w=${w}&h=${h}`;
      }
    },
    ID: { unique: () => "unique()" },
    // Soft-exported by newer SDKs; absent in 27. Keep undefined so namespace reads are safe.
    Apps: undefined,
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
