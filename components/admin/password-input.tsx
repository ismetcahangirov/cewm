"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { useT } from "@/lib/admin/i18n/use-t";
import { cn } from "@/lib/utils";

export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const label = visible ? t("Şifrəni gizlət") : t("Şifrəni göstər");

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-11", className)} />
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={visible}
        aria-controls={props.id}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-graphite"
      >
        {visible ? (
          <EyeOff aria-hidden="true" strokeWidth={1.5} className="size-4" />
        ) : (
          <Eye aria-hidden="true" strokeWidth={1.5} className="size-4" />
        )}
      </button>
    </div>
  );
}
