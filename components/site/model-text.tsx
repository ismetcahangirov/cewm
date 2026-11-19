import { Fragment } from "react";

const modelCode = /[A-Za-z]{1,10}-\d[\p{L}\p{N}-]*/gu;

export function ModelText({ text }: { text: string }) {
  const parts: Array<{ value: string; model: boolean }> = [];
  let cursor = 0;
  for (const match of text.matchAll(modelCode)) {
    if (match.index > cursor) parts.push({ value: text.slice(cursor, match.index), model: false });
    parts.push({ value: match[0], model: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push({ value: text.slice(cursor), model: false });
  return parts.map((part, index) =>
    part.model ? (
      <span key={index} className="whitespace-nowrap">
        {part.value}
      </span>
    ) : (
      <Fragment key={index}>{part.value}</Fragment>
    ),
  );
}
