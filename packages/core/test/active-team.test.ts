import { beforeEach, describe, expect, it } from "vitest";
import { getStoredActiveTeamId, setStoredActiveTeamId } from "../src/active-team.js";

describe("active-team storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips per project", () => {
    setStoredActiveTeamId("proj-a", "team-1");
    setStoredActiveTeamId("proj-b", "team-2");
    expect(getStoredActiveTeamId("proj-a")).toBe("team-1");
    expect(getStoredActiveTeamId("proj-b")).toBe("team-2");
    setStoredActiveTeamId("proj-a", null);
    expect(getStoredActiveTeamId("proj-a")).toBeNull();
  });
});
