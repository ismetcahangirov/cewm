export const azerbaijaniMobileCodes = ["10", "50", "51", "55", "60", "70", "77", "99"] as const;

export const azerbaijaniLandlineCodes = [
  "12",
  "18",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "36",
] as const;

const knownCodes: readonly string[] = [...azerbaijaniMobileCodes, ...azerbaijaniLandlineCodes];

export function normalizeAzerbaijaniPhone(raw: string): string | null {
  const compact = raw.trim().replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(compact)) return null;
  const digits = compact.replace(/^\+/, "");

  let national: string;
  if (compact.startsWith("+")) {
    if (!digits.startsWith("994")) return null;
    national = digits.slice(3);
  } else if (digits.startsWith("994") && digits.length >= 12) {
    national = digits.slice(3);
  } else if (digits.startsWith("0") && digits.length === 10) {
    national = digits.slice(1);
  } else {
    national = digits;
  }
  if (national.length === 10 && national.startsWith("0")) national = national.slice(1);

  if (!/^\d{9}$/.test(national) || !knownCodes.includes(national.slice(0, 2))) return null;
  return `+994${national}`;
}

export function formatAzerbaijaniPhone(phone: string): string {
  const match = /^\+994(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return match ? `+994 ${match[1]} ${match[2]} ${match[3]} ${match[4]}` : phone;
}

export function formatPhoneInput(value: string): string {
  const trimmed = value.trimStart();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") || digits.startsWith("994")) {
    const rest = digits.slice(3, 12);
    const groups = [rest.slice(0, 2), rest.slice(2, 5), rest.slice(5, 7), rest.slice(7, 9)].filter(
      Boolean,
    );
    return digits.length <= 3 ? `+${digits}` : `+994 ${groups.join(" ")}`;
  }
  if (digits.startsWith("0")) {
    const rest = digits.slice(0, 10);
    return [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6, 8), rest.slice(8, 10)]
      .filter(Boolean)
      .join(" ");
  }
  const rest = digits.slice(0, 9);
  return [rest.slice(0, 2), rest.slice(2, 5), rest.slice(5, 7), rest.slice(7, 9)]
    .filter(Boolean)
    .join(" ");
}
