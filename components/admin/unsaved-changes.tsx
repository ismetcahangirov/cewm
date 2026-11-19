"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "./confirm-dialog";
import { useT } from "@/lib/admin/i18n/use-t";

export function useUnsavedChangesGuard(dirty: boolean) {
  const router = useRouter();
  const t = useT();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const dirtyRef = useRef(dirty);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
    }

    function onClick(event: MouseEvent) {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  const dialog = (
    <ConfirmDialog
      open={pendingHref !== null}
      onOpenChange={(open) => {
        if (!open) setPendingHref(null);
      }}
      title={t("Saxlanmamış dəyişikliklər var")}
      description={t("Səhifədən çıxsanız, etdiyiniz dəyişikliklər itəcək.")}
      confirmLabel={t("Saxlamadan çıx")}
      destructive
      onConfirm={() => {
        const href = pendingHref;
        dirtyRef.current = false;
        setPendingHref(null);
        if (href) router.push(href);
      }}
    />
  );

  return {
    dialog,
    release() {
      dirtyRef.current = false;
    },
  };
}
