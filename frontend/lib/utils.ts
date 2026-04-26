import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function nf(n: number | null | undefined, opts: Intl.NumberFormatOptions = {}): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN", opts).format(n);
}

export function pct(n: number | null | undefined, fractionDigits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(fractionDigits)}%`;
}

/**
 * Map a trust band to muted, paper-tone classes.
 * No neon — these are designed to read on a cream background.
 */
export function trustClass(band: string | undefined): string {
  switch (band) {
    case "HIGH_TRUST":
      return "text-moss border-moss/60 bg-moss/10";
    case "MEDIUM_TRUST":
      return "text-accent-2 border-accent-2/60 bg-accent-2/10";
    case "LOW_TRUST":
      return "text-ochre border-ochre/60 bg-ochre/10";
    case "QUARANTINED":
      return "text-accent border-accent/60 bg-accent/10";
    default:
      return "text-ink-3 border-rule bg-paper-2";
  }
}

export function trustSwatch(band: string | undefined): string {
  switch (band) {
    case "HIGH_TRUST":
      return "swatch-high";
    case "MEDIUM_TRUST":
      return "swatch-medium";
    case "LOW_TRUST":
      return "swatch-low";
    case "QUARANTINED":
      return "swatch-quarantine";
    default:
      return "bg-ink-4";
  }
}

export function statusClass(status: string | undefined): string {
  switch (status) {
    case "COMPLIANT":
      return "text-moss border-moss/60 bg-moss/10";
    case "FLAGGED":
      return "text-ochre border-ochre/60 bg-ochre/10";
    case "CRITICAL_GAP":
      return "text-accent border-accent/60 bg-accent/10";
    default:
      return "text-ink-3 border-rule bg-paper-2";
  }
}

export function titleCase(s: string | undefined): string {
  if (!s) return "";
  return s
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

/** A roman numeral or sequence label, e.g. "I", "II", … "XII". */
export function roman(n: number): string {
  const m: [number, string][] = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  let v = n;
  for (const [val, ch] of m) {
    while (v >= val) {
      out += ch;
      v -= val;
    }
  }
  return out;
}
