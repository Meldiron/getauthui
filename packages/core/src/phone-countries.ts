/** Curated E.164 dial-code list for the phone country picker. No heavyweight deps. */

export interface PhoneCountry {
  /** ISO 3166-1 alpha-2. */
  iso: string;
  name: string;
  /** Dial code including leading +, e.g. "+1". */
  dial: string;
}

/** Regional-indicator flag emoji for an ISO country code. */
export function flagEmoji(iso: string): string {
  const code = iso.trim().toUpperCase();
  if (code.length !== 2) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (code.charCodeAt(0) - 65), A + (code.charCodeAt(1) - 65));
}

/**
 * Common countries for SMS auth. Sorted by English name.
 * Dial codes for shared NANP territories stay as +1; parse prefers US for +1.
 */
export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  { iso: "AF", name: "Afghanistan", dial: "+93" },
  { iso: "AL", name: "Albania", dial: "+355" },
  { iso: "DZ", name: "Algeria", dial: "+213" },
  { iso: "AR", name: "Argentina", dial: "+54" },
  { iso: "AM", name: "Armenia", dial: "+374" },
  { iso: "AU", name: "Australia", dial: "+61" },
  { iso: "AT", name: "Austria", dial: "+43" },
  { iso: "AZ", name: "Azerbaijan", dial: "+994" },
  { iso: "BH", name: "Bahrain", dial: "+973" },
  { iso: "BD", name: "Bangladesh", dial: "+880" },
  { iso: "BY", name: "Belarus", dial: "+375" },
  { iso: "BE", name: "Belgium", dial: "+32" },
  { iso: "BO", name: "Bolivia", dial: "+591" },
  { iso: "BA", name: "Bosnia and Herzegovina", dial: "+387" },
  { iso: "BR", name: "Brazil", dial: "+55" },
  { iso: "BG", name: "Bulgaria", dial: "+359" },
  { iso: "KH", name: "Cambodia", dial: "+855" },
  { iso: "CM", name: "Cameroon", dial: "+237" },
  { iso: "CA", name: "Canada", dial: "+1" },
  { iso: "CL", name: "Chile", dial: "+56" },
  { iso: "CN", name: "China", dial: "+86" },
  { iso: "CO", name: "Colombia", dial: "+57" },
  { iso: "CR", name: "Costa Rica", dial: "+506" },
  { iso: "HR", name: "Croatia", dial: "+385" },
  { iso: "CY", name: "Cyprus", dial: "+357" },
  { iso: "CZ", name: "Czechia", dial: "+420" },
  { iso: "DK", name: "Denmark", dial: "+45" },
  { iso: "DO", name: "Dominican Republic", dial: "+1" },
  { iso: "EC", name: "Ecuador", dial: "+593" },
  { iso: "EG", name: "Egypt", dial: "+20" },
  { iso: "EE", name: "Estonia", dial: "+372" },
  { iso: "ET", name: "Ethiopia", dial: "+251" },
  { iso: "FI", name: "Finland", dial: "+358" },
  { iso: "FR", name: "France", dial: "+33" },
  { iso: "GE", name: "Georgia", dial: "+995" },
  { iso: "DE", name: "Germany", dial: "+49" },
  { iso: "GH", name: "Ghana", dial: "+233" },
  { iso: "GR", name: "Greece", dial: "+30" },
  { iso: "GT", name: "Guatemala", dial: "+502" },
  { iso: "HK", name: "Hong Kong", dial: "+852" },
  { iso: "HU", name: "Hungary", dial: "+36" },
  { iso: "IS", name: "Iceland", dial: "+354" },
  { iso: "IN", name: "India", dial: "+91" },
  { iso: "ID", name: "Indonesia", dial: "+62" },
  { iso: "IE", name: "Ireland", dial: "+353" },
  { iso: "IL", name: "Israel", dial: "+972" },
  { iso: "IT", name: "Italy", dial: "+39" },
  { iso: "JM", name: "Jamaica", dial: "+1" },
  { iso: "JP", name: "Japan", dial: "+81" },
  { iso: "JO", name: "Jordan", dial: "+962" },
  { iso: "KZ", name: "Kazakhstan", dial: "+7" },
  { iso: "KE", name: "Kenya", dial: "+254" },
  { iso: "KW", name: "Kuwait", dial: "+965" },
  { iso: "LV", name: "Latvia", dial: "+371" },
  { iso: "LB", name: "Lebanon", dial: "+961" },
  { iso: "LT", name: "Lithuania", dial: "+370" },
  { iso: "LU", name: "Luxembourg", dial: "+352" },
  { iso: "MY", name: "Malaysia", dial: "+60" },
  { iso: "MT", name: "Malta", dial: "+356" },
  { iso: "MX", name: "Mexico", dial: "+52" },
  { iso: "MA", name: "Morocco", dial: "+212" },
  { iso: "NP", name: "Nepal", dial: "+977" },
  { iso: "NL", name: "Netherlands", dial: "+31" },
  { iso: "NZ", name: "New Zealand", dial: "+64" },
  { iso: "NG", name: "Nigeria", dial: "+234" },
  { iso: "MK", name: "North Macedonia", dial: "+389" },
  { iso: "NO", name: "Norway", dial: "+47" },
  { iso: "OM", name: "Oman", dial: "+968" },
  { iso: "PK", name: "Pakistan", dial: "+92" },
  { iso: "PA", name: "Panama", dial: "+507" },
  { iso: "PE", name: "Peru", dial: "+51" },
  { iso: "PH", name: "Philippines", dial: "+63" },
  { iso: "PL", name: "Poland", dial: "+48" },
  { iso: "PT", name: "Portugal", dial: "+351" },
  { iso: "PR", name: "Puerto Rico", dial: "+1" },
  { iso: "QA", name: "Qatar", dial: "+974" },
  { iso: "RO", name: "Romania", dial: "+40" },
  { iso: "RU", name: "Russia", dial: "+7" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966" },
  { iso: "RS", name: "Serbia", dial: "+381" },
  { iso: "SG", name: "Singapore", dial: "+65" },
  { iso: "SK", name: "Slovakia", dial: "+421" },
  { iso: "SI", name: "Slovenia", dial: "+386" },
  { iso: "ZA", name: "South Africa", dial: "+27" },
  { iso: "KR", name: "South Korea", dial: "+82" },
  { iso: "ES", name: "Spain", dial: "+34" },
  { iso: "LK", name: "Sri Lanka", dial: "+94" },
  { iso: "SE", name: "Sweden", dial: "+46" },
  { iso: "CH", name: "Switzerland", dial: "+41" },
  { iso: "TW", name: "Taiwan", dial: "+886" },
  { iso: "TZ", name: "Tanzania", dial: "+255" },
  { iso: "TH", name: "Thailand", dial: "+66" },
  { iso: "TN", name: "Tunisia", dial: "+216" },
  { iso: "TR", name: "Turkey", dial: "+90" },
  { iso: "UA", name: "Ukraine", dial: "+380" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971" },
  { iso: "GB", name: "United Kingdom", dial: "+44" },
  { iso: "US", name: "United States", dial: "+1" },
  { iso: "UY", name: "Uruguay", dial: "+598" },
  { iso: "UZ", name: "Uzbekistan", dial: "+998" },
  { iso: "VE", name: "Venezuela", dial: "+58" },
  { iso: "VN", name: "Vietnam", dial: "+84" },
];

const BY_ISO = new Map(PHONE_COUNTRIES.map((c) => [c.iso, c]));

/** Preferred ISO when several countries share a dial code. */
const DIAL_PREFERRED: Record<string, string> = {
  "+1": "US",
  "+7": "RU",
};

/** Look up a country by ISO, or undefined. */
export function getPhoneCountry(iso: string): PhoneCountry | undefined {
  return BY_ISO.get(iso.trim().toUpperCase());
}

/** Default ISO from a BCP 47 language tag (e.g. en-US → US), else US. */
export function defaultPhoneCountryIso(lang?: string): string {
  const raw =
    lang ??
    (typeof navigator !== "undefined" ? navigator.language || navigator.languages?.[0] : undefined);
  const region = raw?.split(/[-_]/)[1]?.toUpperCase();
  if (region && BY_ISO.has(region)) return region;
  return "US";
}

/** Digits only. */
export function digitsOnly(value: string): string {
  return value.replace(/\D+/g, "");
}

/**
 * Build an E.164 number from a country ISO and a national (or pasted) number.
 * If `national` already starts with +, it is normalized as a full international number.
 */
export function toE164(iso: string, national: string): string {
  const trimmed = national.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) {
    const d = digitsOnly(trimmed);
    return d ? `+${d}` : "";
  }
  const country = getPhoneCountry(iso) ?? getPhoneCountry("US")!;
  const dialDigits = digitsOnly(country.dial);
  let local = digitsOnly(trimmed);
  // Drop a leading trunk 0 when present.
  if (local.startsWith("0")) local = local.slice(1);
  // If the user typed the country code into the national field, do not double it.
  if (local.startsWith(dialDigits) && local.length > dialDigits.length) {
    local = local.slice(dialDigits.length);
  }
  return local ? `+${dialDigits}${local}` : "";
}

export interface ParsedPhone {
  iso: string;
  national: string;
  e164: string;
}

/**
 * Split an E.164 (or loose) phone into country ISO + national digits.
 * Prefers the longest matching dial code; for shared codes uses DIAL_PREFERRED.
 */
export function parsePhone(input: string, fallbackIso = "US"): ParsedPhone {
  const trimmed = input.trim();
  if (!trimmed) {
    return { iso: fallbackIso, national: "", e164: "" };
  }
  const e164 = trimmed.startsWith("+") ? `+${digitsOnly(trimmed)}` : toE164(fallbackIso, trimmed);
  if (!e164) return { iso: fallbackIso, national: "", e164: "" };

  const digits = e164.slice(1);
  let bestDialLen = 0;
  const matches: PhoneCountry[] = [];
  for (const c of PHONE_COUNTRIES) {
    const dialDigits = digitsOnly(c.dial);
    if (!digits.startsWith(dialDigits)) continue;
    if (dialDigits.length > bestDialLen) {
      bestDialLen = dialDigits.length;
      matches.length = 0;
      matches.push(c);
    } else if (dialDigits.length === bestDialLen) {
      matches.push(c);
    }
  }

  if (matches.length === 0) {
    return { iso: fallbackIso, national: digits, e164 };
  }

  const dial = matches[0].dial;
  const preferredIso = DIAL_PREFERRED[dial];
  const chosen =
    (preferredIso && matches.find((m) => m.iso === preferredIso)) ||
    matches.find((m) => m.iso === fallbackIso) ||
    matches[0];
  const national = digits.slice(digitsOnly(chosen.dial).length);
  return { iso: chosen.iso, national, e164: `+${digitsOnly(chosen.dial)}${national}` };
}
