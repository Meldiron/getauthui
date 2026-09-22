import { html, nothing, type TemplateResult } from "lit";

/** Keep digits only, capped at `max`. */
export function digitsOnly(raw: string, max: number): string {
  return raw.replace(/\D/g, "").slice(0, max);
}

export interface OtpInputOptions {
  id: string;
  value: string;
  /** Total digits. Default 6 (3 + separator + 3). */
  length?: number;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string | null;
  /** Accessible name when a visible label is not associated. */
  ariaLabel?: string;
  autocomplete?: string;
  onChange: (value: string) => void;
}

/**
 * Vibes-style segmented OTP: one accessible input, 3 + sep + 3 visual slots.
 * The native input sits in the form for constraint validation and paste/autocomplete.
 */
export function otpInput(opts: OtpInputOptions): TemplateResult {
  const length = opts.length ?? 6;
  const value = digitsOnly(opts.value, length);
  const split = Math.ceil(length / 2);
  const activeIndex = Math.min(value.length, length - 1);

  const onInput = (e: Event) => {
    const el = e.target as HTMLInputElement;
    const next = digitsOnly(el.value, length);
    el.value = next;
    opts.onChange(next);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // Allow navigation keys, shortcuts, and backspace through; block non-digits.
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "Enter" ||
      e.key === "Escape" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Home" ||
      e.key === "End"
    ) {
      return;
    }
    if (e.key.length === 1 && !/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const slot = (index: number) => {
    const filled = value[index] ?? "";
    const active = !opts.disabled && index === activeIndex;
    return html`<div
      class="otp-slot ${filled ? "otp-slot-filled" : ""} ${active ? "otp-slot-active" : ""}"
      aria-hidden="true"
    >
      ${filled}
    </div>`;
  };

  const group = (from: number, to: number) =>
    html`<div class="otp-group">
      ${Array.from({ length: to - from }, (_, i) => slot(from + i))}
    </div>`;

  return html`
    <div
      class="otp ${opts.invalid ? "otp-invalid" : ""} ${opts.disabled ? "otp-disabled" : ""}"
      data-otp
    >
      ${group(0, split)}
      <div class="otp-sep" aria-hidden="true"><span></span></div>
      ${group(split, length)}
      <input
        class="otp-native"
        id=${opts.id}
        type="text"
        inputmode="numeric"
        autocomplete=${opts.autocomplete ?? "one-time-code"}
        maxlength=${length}
        minlength=${length}
        pattern="[0-9]{${length}}"
        ?required=${opts.required !== false}
        ?disabled=${opts.disabled}
        .value=${value}
        @input=${onInput}
        @keydown=${onKeyDown}
        aria-invalid=${opts.invalid ? "true" : nothing}
        aria-describedby=${opts.describedBy ? opts.describedBy : nothing}
        aria-label=${opts.ariaLabel ? opts.ariaLabel : nothing}
      />
    </div>
  `;
}
