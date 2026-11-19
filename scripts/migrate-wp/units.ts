const unitTokens = [
  "m³/h",
  "m3/h",
  "м³/ч",
  "l/min",
  "л/мин",
  "m/min",
  "m/dəq",
  "м/мин",
  "mm/s",
  "U/min",
  "min-1",
  "kVA",
  "kW",
  "кВт",
  "kN",
  "кН",
  "kg",
  "кг",
  "mm",
  "мм",
  "cm",
  "см",
  "bar",
  "бар",
  "Hz",
  "dB(A)",
  "dB",
  "rpm",
  "°C",
  "°",
  "%",
  "V",
  "A",
  "t",
  "т",
  "m",
  "м",
  "l",
  "л",
];

const escaped = unitTokens
  .slice()
  .sort((a, b) => b.length - a.length)
  .map((token) => token.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&"));

const trailingUnit = new RegExp(
  String.raw`^((?:[^\d\s]{1,12}\.?\s)?\d[\d\s.,/–—\-±|]*?)\s*(${escaped.join("|")})$`,
  "u",
);

const bracketUnit = /^(.*?)\s*\[([^\]]{1,20})\]$/u;

export type UnitSplit = { value: string; unit: string | null };

export function splitValueUnit(raw: string): UnitSplit {
  const text = raw.trim();
  const bracket = bracketUnit.exec(text);
  if (bracket && /\d/.test(bracket[1]) && !/\[/.test(bracket[1])) {
    return { value: bracket[1].trim(), unit: bracket[2].trim() };
  }
  const match = trailingUnit.exec(text);
  if (match) return { value: match[1].trim(), unit: match[2] };
  return { value: text, unit: null };
}

export function splitLabelUnit(raw: string): UnitSplit {
  const text = raw.trim();
  const match = bracketUnit.exec(text);
  if (match && match[1] && !/\[/.test(match[1])) {
    return { value: match[1].trim(), unit: match[2].trim() };
  }
  return { value: text, unit: null };
}
