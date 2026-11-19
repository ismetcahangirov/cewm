"use client";

import { Clapperboard, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { MediaThumb } from "@/components/admin/image-picker";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/admin/i18n/use-t";
import { useDeleteHeroFilmMutation, useGetHeroFilmsQuery } from "@/lib/api/hero-films";
import { apiErrorMessage } from "@/lib/api/types";
import type { HeroFilmDto } from "@/lib/validation/hero-films";

import { HeroFilmDialog } from "./hero-film-dialog";

const gridClass = "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3";

export function HeroFilmsView() {
  const t = useT();
  const { data, isLoading, isError, refetch } = useGetHeroFilmsQuery();
  const [remove] = useDeleteHeroFilmMutation();
  const [editing, setEditing] = useState<HeroFilmDto | "new" | null>(null);
  const [deleting, setDeleting] = useState<HeroFilmDto | null>(null);

  async function confirmDelete(): Promise<boolean> {
    if (!deleting) return true;
    try {
      await remove(deleting.id).unwrap();
      toast.success(t("«{name}» silindi.", { name: deleting.name }));
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error));
      return false;
    }
  }

  return (
    <>
      <PageHeader
        title={t("Hero filmləri")}
        description={t(
          "Ana səhifənin hero bölməsində scroll ilə oynadılan kadr ardıcıllıqları. Filmi «Ana səhifə bölmələri»ndə seçin.",
        )}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus strokeWidth={1.5} />
            {t("Yeni film")}
          </Button>
        }
      />
      {isError ? (
        <EmptyState
          action={
            <Button variant="outline" onClick={() => refetch()}>
              {t("Yenidən yüklə")}
            </Button>
          }
        >
          {t("Filmlər yüklənmədi.")}
        </EmptyState>
      ) : isLoading ? (
        <div className={gridClass} aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="aspect-video w-full" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState action={<Button onClick={() => setEditing("new")}>{t("Yeni film")}</Button>}>
          {t("Hələ hero filmi əlavə olunmayıb.")}
        </EmptyState>
      ) : (
        <ul className={gridClass}>
          {data.map((film) => (
            <li key={film.id} className="flex flex-col border border-border bg-white">
              <button
                type="button"
                onClick={() => setEditing(film)}
                aria-label={t("{name}: redaktə et", { name: film.name })}
                className="relative aspect-video w-full bg-surface outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {film.poster ? (
                  <MediaThumb media={film.poster} sizes="(min-width: 640px) 400px, 100vw" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <Clapperboard aria-hidden="true" strokeWidth={1.5} className="size-10" />
                  </span>
                )}
              </button>
              <div className="flex items-start gap-2 p-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-meta">
                  <span className="truncate font-medium">{film.name}</span>
                  <span className="truncate text-muted-foreground">
                    {t("{count} kadr · {width}×{height} · {format}", {
                      count: film.frameCount,
                      width: film.frameWidth,
                      height: film.frameHeight,
                      format: film.format.toUpperCase(),
                    })}
                  </span>
                  <code className="truncate text-muted-foreground">{film.keyPrefix}/</code>
                </div>
                {film.inUse ? <Badge variant="outline">{t("Hero-da")}</Badge> : null}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("{name}: redaktə et", { name: film.name })}
                  onClick={() => setEditing(film)}
                >
                  <Pencil strokeWidth={1.5} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("{name}: sil", { name: film.name })}
                  onClick={() => setDeleting(film)}
                >
                  <Trash2 strokeWidth={1.5} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <HeroFilmDialog
          film={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={deleting ? t("«{name}» silinsin?", { name: deleting.name }) : ""}
        description={t(
          "Film qeydi silinəcək, hero bölməsi filmsiz qalacaq. Yaddaşdakı kadr faylları silinmir.",
        )}
        confirmLabel={t("Sil")}
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
