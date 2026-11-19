"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildCategoryTree, flattenTree } from "@/lib/admin/category-tree";
import { useT } from "@/lib/admin/i18n/use-t";
import { useDeleteCategoryMutation } from "@/lib/api/admin";
import { apiErrorMessage } from "@/lib/api/types";
import type { CategoryNodeDto } from "@/lib/validation/categories";
import { useContentText } from "@/lib/store/hooks";

const keep = "none";

export function DeleteCategoryDialog({
  category,
  categories,
  hasChildren,
  onClose,
  redirectTo,
}: {
  category: CategoryNodeDto;
  categories: CategoryNodeDto[];
  hasChildren: boolean;
  onClose: () => void;
  redirectTo?: string;
}) {
  const t = useT();
  const text = useContentText();
  const router = useRouter();
  const [deleteCategory, { isLoading }] = useDeleteCategoryMutation();
  const targets = useMemo(
    () =>
      flattenTree(buildCategoryTree(categories)).filter(
        (node) => node.id !== category.id && node.parentId !== category.id,
      ),
    [categories, category.id],
  );
  const [target, setTarget] = useState<string>(
    category.productCount ? (category.parentId ?? targets[0]?.id ?? keep) : keep,
  );
  const parent = categories.find((node) => node.id === category.parentId);

  async function confirm() {
    try {
      await deleteCategory({
        id: category.id,
        moveProductsTo: target === keep ? null : target,
      }).unwrap();
      const moved = categories.find((node) => node.id === target);
      toast.success(
        moved && category.productCount
          ? t("«{name}» silindi, məhsullar «{target}» kateqoriyasına köçdü.", {
              name: text(category.name),
              target: text(moved.name),
            })
          : t("«{name}» silindi.", { name: text(category.name) }),
      );
      onClose();
      if (redirectTo) router.push(redirectTo);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !isLoading ? onClose() : null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("«{name}» silinsin?", { name: text(category.name) })}</DialogTitle>
          <DialogDescription>{t("Bu əməliyyat geri qaytarılmır.")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 text-meta">
          {category.productCount ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="move-products" className="text-meta font-medium">
                {t("{count} məhsul hara köçsün?", { count: category.productCount })}
              </Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger id="move-products" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.depth ? `— ${text(node.name)}` : text(node.name)}
                    </SelectItem>
                  ))}
                  <SelectItem value={keep}>{t("Köçürmə, bu kateqoriyadan çıxar")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground">
                {t("Məhsulların başqa kateqoriyaları varsa, onlar dəyişmir.")}
              </p>
            </div>
          ) : (
            <p>{t("Bu kateqoriyada məhsul yoxdur.")}</p>
          )}
          {hasChildren ? (
            <p>
              {parent
                ? t("Alt kateqoriyalar silinmir: «{name}» altına keçəcək.", {
                    name: text(parent.name),
                  })
                : t("Alt kateqoriyalar silinmir: əsas səviyyəyə keçəcək.")}
            </p>
          ) : null}
          {category.menuItemCount ? (
            <p>
              {t("Menyulardakı {count} keçid də silinəcək.", { count: category.menuItemCount })}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isLoading} onClick={onClose}>
            {t("Ləğv et")}
          </Button>
          <Button
            type="button"
            disabled={isLoading}
            onClick={confirm}
            className="border-destructive bg-destructive text-white hover:bg-destructive hover:text-white hover:opacity-90"
          >
            {t("Sil")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
