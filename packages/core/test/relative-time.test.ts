import { describe, expect, it } from "vitest";
import { relativeTimeParts } from "../src/relative-time.js";

describe("relativeTimeParts", () => {
  const now = Date.parse("2026-09-23T15:00:00.000Z");

  it("returns null for missing or invalid input", () => {
    expect(relativeTimeParts(undefined, now)).toBeNull();
    expect(relativeTimeParts("", now)).toBeNull();
    expect(relativeTimeParts("not-a-date", now)).toBeNull();
  });

  it("marks sub-minute deltas as justNow", () => {
    const parts = relativeTimeParts(new Date(now - 15_000).toISOString(), now);
    expect(parts).toMatchObject({ justNow: true, isFuture: false });
  });

  it("picks minute/hour/day units for the past", () => {
    expect(relativeTimeParts(new Date(now - 5 * 60_000).toISOString(), now)).toMatchObject({
      count: 5,
      unit: "minute",
      isFuture: false,
      justNow: false,
    });
    expect(relativeTimeParts(new Date(now - 3 * 3_600_000).toISOString(), now)).toMatchObject({
      count: 3,
      unit: "hour",
    });
    expect(relativeTimeParts(new Date(now - 2 * 86_400_000).toISOString(), now)).toMatchObject({
      count: 2,
      unit: "day",
    });
  });

  it("marks future timestamps for session expiry", () => {
    const parts = relativeTimeParts(new Date(now + 10 * 86_400_000).toISOString(), now);
    expect(parts).toMatchObject({ count: 1, unit: "week", isFuture: true });
  });
});
