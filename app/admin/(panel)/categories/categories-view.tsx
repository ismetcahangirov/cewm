"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  CornerDownRight,
  CornerUpLeft,
  Ellipsis,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ComponentProps, type CSSProperties } from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader } from "@/components/admin/page-header";
import {
  dragAnnouncements,
  dragInstructions,
  DragHandle,
  useDragSensors,
} from "@/components/admin/sortable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { buildCategoryTree, flattenTree, type CategoryTreeNode } from "@/lib/admin/category-tree";
import { useT } from "@/lib/admin/i18n/use-t";
import {
  useGetCategoriesQuery,
  useReorderCategoriesMutation,
  useToggleCategoryMutation,
} from "@/lib/api/admin";
import { apiErrorMessage } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { categoryMaxDepth, type CategoryNodeDto } from "@/lib/validation/categories";
import { useContentText } from "@/lib/store/hooks";

import { DeleteCategoryDialog } from "./delete-category-dialog";

const indent = 40;

type Placement = { parentId: string | null; depth: number };

type FlatItem = CategoryTreeNode;

function projectPlacement(
  items: FlatItem[],
  activeId: string,
  overId: string,
  offsetX: number,
  activeHasChildren: boolean,
): Placement | null {
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const overIndex = items.findIndex((item) => item.id === overId);
  const active = items[activeIndex];
  if (!active || overIndex < 0) return null;
  const moved = arrayMove(items, activeIndex, overIndex);
  const previous = moved[overIndex - 1];
  const next = moved[overIndex + 1];
  const wanted = active.depth + Math.round(offsetX / indent);
  const maxDepth = activeHasChildren
    ? 0
    : previous
      ? Math.min(previous.depth + 1, categoryMaxDepth)
      : 0;
  const minDepth = next ? next.depth : 0;
  if (minDepth > maxDepth) return null;
  const depth = Math.min(Math.max(wanted, minDepth), maxDepth);
  if (depth === 0) return { parentId: null, depth };
  const parentId = previous ? (previous.depth === 0 ? previous.id : previous.parentId) : null;
  return parentId ? { parentId, depth } : { parentId: null, depth: 0 };
}

type RowProps = {
  node: CategoryNodeDto;
  depth: number;
  hasChildren: boolean;
  canIndent: boolean;
  canOutdent: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
  onIndent: () => void;
  onOutdent: () => void;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
};

function CategoryRowContent({
  node,
  depth,
  hasChildren,
  handle,
  canIndent,
  canOutdent,
  isFirst,
  isLast,
  onMove,
  onIndent,
  onOutdent,
  onToggle,
  onDelete,
}: RowProps & { handle: ComponentProps<"button"> }) {
  const t = useT();
  const text = useContentText();
  return (
    <div
      className="flex min-h-14 items-center gap-2 py-1 pr-2"
      style={{ paddingLeft: `${depth * indent + 4}px` }}
    >
      <DragHandle label={t("{label}: yerini dəyiş", { label: text(node.name) })} {...handle} />
      <span className="relative size-10 shrink-0 border border-border bg-surface max-sm:hidden">
        {node.image ? (
          <Image src={node.image.src} alt="" fill sizes="40px" className="object-contain" />
        ) : null}
      </span>
      <div className="relative min-w-0 flex-1 text-meta">
        <Link
          href={`/admin/categories/${node.id}`}
          className="block truncate font-medium after:absolute after:inset-0 hover:underline"
        >
          {text(node.name)}
        </Link>
        <span className="block truncate text-muted-foreground">
          {t("{count} məhsul", { count: node.productCount })}
          {hasChildren ? ` · ${t("alt kateqoriyaları var")}` : ""}
        </span>
      </div>
      {node.isActive ? null : (
        <Badge variant="outline" className="max-sm:hidden">
          {t("Gizli")}
        </Badge>
      )}
      <Switch
        checked={node.isActive}
        onCheckedChange={onToggle}
        aria-label={t("{name}: saytda göstər", { name: text(node.name) })}
        title={node.isActive ? t("Saytda görünür") : t("Saytda gizlədilib")}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("{name}: əməliyyatlar", { name: text(node.name) })}
          >
            <Ellipsis strokeWidth={1.5} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem asChild>
            <Link href={`/admin/categories/${node.id}`}>
              <Pencil strokeWidth={1.5} />
              {t("Redaktə et")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isFirst} onSelect={() => onMove(-1)}>
            <ArrowUp strokeWidth={1.5} />
            {t("Yuxarı")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isLast} onSelect={() => onMove(1)}>
            <ArrowDown strokeWidth={1.5} />
            {t("Aşağı")}
          </DropdownMenuItem>
          {canIndent ? (
            <DropdownMenuItem onSelect={onIndent}>
              <CornerDownRight strokeWidth={1.5} />
              {t("Yuxarıdakının alt kateqoriyası et")}
            </DropdownMenuItem>
          ) : null}
          {canOutdent ? (
            <DropdownMenuItem onSelect={onOutdent}>
              <CornerUpLeft strokeWidth={1.5} />
              {t("Əsas səviyyəyə çıxar")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 strokeWidth={1.5} />
            {t("Sil")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SortableCategoryRow({ dragging, ...rest }: RowProps & { dragging: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id: rest.node.id });
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b border-border bg-white last:border-0",
        dragging ? "opacity-40" : null,
      )}
    >
      <CategoryRowContent
        {...rest}
        handle={
          { ref: setActivatorNodeRef, ...attributes, ...listeners } as ComponentProps<"button">
        }
      />
    </li>
  );
}

export function CategoriesView() {
  const t = useT();
  const text = useContentText();
  const { data, isLoading, isError, refetch } = useGetCategoriesQuery();
  const [reorder] = useReorderCategoriesMutation();
  const [toggle] = useToggleCategoryMutation();
  const sensors = useDragSensors();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [deleting, setDeleting] = useState<CategoryNodeDto | null>(null);

  const nodes = useMemo(() => data ?? [], [data]);
  const flat = useMemo(() => flattenTree(buildCategoryTree(nodes)), [nodes]);
  const childCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of nodes) {
      if (node.parentId) counts.set(node.parentId, (counts.get(node.parentId) ?? 0) + 1);
    }
    return counts;
  }, [nodes]);
  const visible = activeId ? flat.filter((item) => item.parentId !== activeId) : flat;
  const active = activeId ? flat.find((item) => item.id === activeId) : undefined;
  const projected =
    activeId && overId
      ? projectPlacement(visible, activeId, overId, offsetX, (childCount.get(activeId) ?? 0) > 0)
      : null;
  const labels = new Map(flat.map((item) => [item.id, text(item.name)]));

  function siblingsOf(parentId: string | null): FlatItem[] {
    return flat.filter((item) => item.parentId === parentId);
  }

  async function commit(parentId: string | null, orderedIds: string[], message: string) {
    try {
      await reorder({ parentId, orderedIds }).unwrap();
      toast.success(message);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  function placeAt(id: string, parentId: string | null, index: number) {
    const ids = siblingsOf(parentId)
      .map((item) => item.id)
      .filter((value) => value !== id);
    ids.splice(Math.max(0, Math.min(index, ids.length)), 0, id);
    return ids;
  }

  function onDragStart({ active: dragged }: DragStartEvent) {
    setActiveId(String(dragged.id));
    setOverId(String(dragged.id));
    setOffsetX(0);
  }

  function onDragMove({ delta }: DragMoveEvent) {
    setOffsetX(delta.x);
  }

  function onDragOver({ over }: DragOverEvent) {
    setOverId(over ? String(over.id) : null);
  }

  function resetDrag() {
    setActiveId(null);
    setOverId(null);
    setOffsetX(0);
  }

  function onDragEnd({ active: dragged, over }: DragEndEvent) {
    const placement =
      over && activeId
        ? projectPlacement(
            visible,
            activeId,
            String(over.id),
            offsetX,
            (childCount.get(activeId) ?? 0) > 0,
          )
        : null;
    resetDrag();
    if (!over || !placement) return;
    const id = String(dragged.id);
    const current = flat.find((item) => item.id === id);
    if (!current) return;
    const activeIndex = visible.findIndex((item) => item.id === id);
    const overIndex = visible.findIndex((item) => item.id === String(over.id));
    const moved = arrayMove(visible, activeIndex, overIndex).map((item) =>
      item.id === id ? { ...item, parentId: placement.parentId } : item,
    );
    const orderedIds = moved
      .filter((item) => item.parentId === placement.parentId)
      .map((item) => item.id);
    const unchanged =
      current.parentId === placement.parentId &&
      orderedIds.join() ===
        siblingsOf(placement.parentId)
          .map((item) => item.id)
          .join();
    if (unchanged) return;
    void commit(
      placement.parentId,
      orderedIds,
      t("«{name}» yerləşdirildi.", { name: text(current.name) }),
    );
  }

  function move(node: FlatItem, direction: -1 | 1) {
    const siblings = siblingsOf(node.parentId);
    const index = siblings.findIndex((item) => item.id === node.id);
    const ids = arrayMove(
      siblings.map((item) => item.id),
      index,
      index + direction,
    );
    void commit(
      node.parentId,
      ids,
      t(direction < 0 ? "«{name}» yuxarı keçdi." : "«{name}» aşağı keçdi.", {
        name: text(node.name),
      }),
    );
  }

  function previousRoot(node: FlatItem): FlatItem | undefined {
    const roots = siblingsOf(null);
    const index = roots.findIndex((item) => item.id === node.id);
    return index > 0 ? roots[index - 1] : undefined;
  }

  function indentNode(node: FlatItem) {
    const parent = previousRoot(node);
    if (!parent) return;
    const ids = placeAt(node.id, parent.id, siblingsOf(parent.id).length);
    void commit(
      parent.id,
      ids,
      t("«{name}» «{parent}» altına keçdi.", {
        name: text(node.name),
        parent: text(parent.name),
      }),
    );
  }

  function outdentNode(node: FlatItem) {
    const parentIndex = siblingsOf(null).findIndex((item) => item.id === node.parentId);
    const ids = placeAt(node.id, null, parentIndex + 1);
    void commit(null, ids, t("«{name}» əsas səviyyəyə çıxdı.", { name: text(node.name) }));
  }

  async function setActive(node: FlatItem, isActive: boolean) {
    try {
      await toggle({ id: node.id, isActive }).unwrap();
      toast.success(
        isActive
          ? t("«{name}» saytda göstərilir.", { name: text(node.name) })
          : t("«{name}» saytda gizlədildi.", { name: text(node.name) }),
      );
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  function rowProps(node: FlatItem) {
    const siblings = siblingsOf(node.parentId);
    const index = siblings.findIndex((item) => item.id === node.id);
    const hasChildren = (childCount.get(node.id) ?? 0) > 0;
    return {
      node,
      hasChildren,
      canIndent: node.depth === 0 && !hasChildren && Boolean(previousRoot(node)),
      canOutdent: node.depth > 0,
      isFirst: index === 0,
      isLast: index === siblings.length - 1,
      onMove: (direction: -1 | 1) => move(node, direction),
      onIndent: () => indentNode(node),
      onOutdent: () => outdentNode(node),
      onToggle: (isActive: boolean) => setActive(node, isActive),
      onDelete: () => setDeleting(node),
    };
  }

  return (
    <>
      <PageHeader
        title={t("Kateqoriyalar")}
        description={t(
          "Sürüşdürərək sıranı dəyişin; sağa çəkərək alt kateqoriya edin. Klaviatura və telefonda sətir menyusundan istifadə edin.",
        )}
        actions={
          <Button asChild>
            <Link href="/admin/categories/new">
              <Plus strokeWidth={1.5} />
              {t("Yeni kateqoriya")}
            </Link>
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
          {t("Kateqoriyalar yüklənmədi.")}
        </EmptyState>
      ) : isLoading ? (
        <div className="flex flex-col gap-px border border-border" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : flat.length === 0 ? (
        <EmptyState
          action={
            <Button asChild>
              <Link href="/admin/categories/new">{t("Yeni kateqoriya")}</Link>
            </Button>
          }
        >
          {t("Hələ kateqoriya yoxdur.")}
        </EmptyState>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={resetDrag}
          accessibility={{
            screenReaderInstructions: dragInstructions,
            announcements: dragAnnouncements((id) => labels.get(id) ?? t("Kateqoriya")),
          }}
        >
          <SortableContext
            items={visible.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="border border-border" aria-label={t("Kateqoriyalar ağacı")}>
              {visible.map((node) => (
                <SortableCategoryRow
                  key={node.id}
                  {...rowProps(node)}
                  depth={node.id === activeId && projected ? projected.depth : node.depth}
                  dragging={node.id === activeId}
                />
              ))}
            </ul>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {active ? (
              <div className="border border-border bg-white shadow-md">
                <CategoryRowContent {...rowProps(active)} depth={active.depth} handle={{}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
      {deleting ? (
        <DeleteCategoryDialog
          category={deleting}
          categories={nodes}
          hasChildren={(childCount.get(deleting.id) ?? 0) > 0}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}
