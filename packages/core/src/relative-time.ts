/** Relative-time unit used with AuthUIStrings templates. */
export type RelativeUnit = "minute" | "hour" | "day" | "week" | "month" | "year";

export interface RelativeTimeParts {
  /** Absolute local datetime for title / tooltip. */
  absolute: string;
  /** ISO timestamp used as the `datetime` attribute when useful. */
  iso: string;
  /** True when the instant is in the future (e.g. session expiry). */
  isFuture: boolean;
  /** True when under 60 seconds from now. */
  justNow: boolean;
  count: number;
  unit: RelativeUnit;
}

/**
 * Break an ISO timestamp into relative parts for i18n via `t()`.
 * Returns null for missing or unparseable input.
 */
export function relativeTimeParts(
  iso: string | undefined | null,
  nowMs: number = Date.now()
): RelativeTimeParts | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const absolute = d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const diffMs = d.getTime() - nowMs;
  const isFuture = diffMs > 0;
  const absMs = Math.abs(diffMs);
  const seconds = Math.floor(absMs / 1000);

  if (seconds < 60) {
    return { absolute, iso, isFuture, justNow: true, count: 0, unit: "minute" };
  }

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  let count: number;
  let unit: RelativeUnit;
  if (years >= 1) {
    count = years;
    unit = "year";
  } else if (months >= 1) {
    count = months;
    unit = "month";
  } else if (weeks >= 1) {
    count = weeks;
    unit = "week";
  } else if (days >= 1) {
    count = days;
    unit = "day";
  } else if (hours >= 1) {
    count = hours;
    unit = "hour";
  } else {
    count = minutes;
    unit = "minute";
  }

  return { absolute, iso, isFuture, justNow: false, count, unit };
}
