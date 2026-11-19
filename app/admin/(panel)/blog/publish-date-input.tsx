"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/admin/i18n/use-t";

const timeZone = "Asia/Baku";

const parts = new Intl.DateTimeFormat("en-GB", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function wallClock(date: Date): Record<string, number> {
  return Object.fromEntries(
    parts
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

export function toBakuInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const { year, month, day, hour, minute } = wallClock(date);
  const pad = (value: number | undefined) => String(value ?? 0).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

export function fromBakuInput(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const seen = wallClock(new Date(guess));
  const seenUtc = Date.UTC(
    seen.year ?? year,
    (seen.month ?? month) - 1,
    seen.day ?? day,
    seen.hour ?? hour,
    seen.minute ?? minute,
  );
  return new Date(guess - (seenUtc - guess)).toISOString();
}

export function PublishDateInput({
  value,
  onChange,
  onBlur,
  id,
  invalid,
  describedBy,
}: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  onBlur?: () => void;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const t = useT();
  const local = toBakuInput(value);
  return (
    <div className="flex gap-2">
      <Input
        id={id}
        type="datetime-local"
        value={local}
        onChange={(event) => onChange(fromBakuInput(event.target.value))}
        onBlur={onBlur}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className="min-w-0 flex-1"
      />
      {local ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("Tarixi təmizlə")}
          title={t("Tarixi təmizlə")}
          onClick={() => onChange(null)}
        >
          <X strokeWidth={1.5} />
        </Button>
      ) : null}
    </div>
  );
}
