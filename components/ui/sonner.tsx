"use client";

import { CircleAlertIcon, CheckIcon, InfoIcon, Loader2Icon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      className="toaster group"
      icons={{
        success: <CheckIcon className="size-4" strokeWidth={1.5} />,
        info: <InfoIcon className="size-4" strokeWidth={1.5} />,
        warning: <CircleAlertIcon className="size-4" strokeWidth={1.5} />,
        error: <CircleAlertIcon className="size-4" strokeWidth={1.5} />,
        loading: <Loader2Icon className="size-4 motion-safe:animate-spin" strokeWidth={1.5} />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "font-sans text-meta shadow-none" } }}
      {...props}
    />
  );
}

export { Toaster };
