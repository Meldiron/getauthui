import { describe, expect, it } from "vitest";
import { scorePassword } from "../src/password-strength.js";

describe("scorePassword", () => {
  it("treats empty as level 0", () => {
    expect(scorePassword("").level).toBe(0);
    expect(scorePassword("").percent).toBe(0);
  });

  it("flags short passwords as too weak", () => {
    const s = scorePassword("Ab1!");
    expect(s.level).toBe(1);
    expect(s.labelKey).toBe("passwordStrengthTooWeak");
    expect(s.checks.length).toBe(false);
  });

  it("scores a fair password", () => {
    const s = scorePassword("Password1");
    expect(s.level).toBeGreaterThanOrEqual(2);
    expect(s.checks.length).toBe(true);
    expect(s.checks.upper).toBe(true);
    expect(s.checks.lower).toBe(true);
    expect(s.checks.number).toBe(true);
  });

  it("scores a very strong password", () => {
    const s = scorePassword("Correct-Horse-Battery-1!");
    expect(s.level).toBe(4);
    expect(s.labelKey).toBe("passwordStrengthVeryStrong");
    expect(s.percent).toBe(100);
  });
});
