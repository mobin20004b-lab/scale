export type BarcodeSymbology = "EAN_13" | "EAN_8" | "CODE_128" | "QR" | "UNKNOWN";

const PREFIX_MAP: Record<string, string> = {
  "]E0": "",
  "EAN:": "",
  "SKU:": "",
  "PCK:": "",
};

export interface BarcodeNormalizationResult {
  raw: string;
  normalized: string;
  symbology: BarcodeSymbology;
  checksumValid: boolean | null;
}

export function verifyEan13Checksum(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const expected = digits.pop()!;
  const sum = digits.reduce((acc, digit, index) => acc + digit * (index % 2 === 0 ? 1 : 3), 0);
  const computed = (10 - (sum % 10)) % 10;
  return computed === expected;
}

export function normalizeBarcode(rawValue: string): BarcodeNormalizationResult {
  const raw = rawValue ?? "";
  let normalized = raw.trim().replace(/\s+/g, "");

  for (const [prefix, replacement] of Object.entries(PREFIX_MAP)) {
    if (normalized.toUpperCase().startsWith(prefix)) {
      normalized = replacement + normalized.slice(prefix.length);
      break;
    }
  }

  const symbology: BarcodeSymbology = /^\d{13}$/.test(normalized)
    ? "EAN_13"
    : /^\d{8}$/.test(normalized)
      ? "EAN_8"
      : /^[A-Z0-9\-_*]+$/i.test(normalized)
        ? "CODE_128"
        : normalized.includes("http") || normalized.includes(":")
          ? "QR"
          : "UNKNOWN";

  const checksumValid = symbology === "EAN_13" ? verifyEan13Checksum(normalized) : null;

  return { raw, normalized, symbology, checksumValid };
}
