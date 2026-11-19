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
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  CornerDownRight,
  CornerUpLeft,
  Ellipsis,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState, type ComponentProps, type CSSProperties } from "react";

import {
  dragAnnouncements,
  dragInstructions,
  DragHandle,
  useDragSensors,
} from "@/components/admin/sortable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  applyDrop,
  describeTarget,
  flattenItems,
  projectDrop,
  subtreeHeight,
  type EditorItem,
  type FlatEditorItem,
} from "@/lib/admin/menu-tree";
import { useT } from "@/lib/admin/i18n/use-t";
import { cn } from "@/lib/utils";
import type { MenuTargetsDto } from "@/lib/validation/menus";
import { useContentText } from "@/lib/store/hooks";

const indent = 24;

export type ItemActions = {
  onEdit: (key: string) => void;
  onAddChild: (key: string) => void;
  onMove: (key: string, direction: -1 | 1) => void;
  onIndent: (key: string) => void;
  onOutdent: (key: string) => void;
  onDelete: (key: string) => void;
};

type RowState = {
  entry: FlatEditorItem;
  depth: number;
  isFirst: boolean;
  isLast: boolean;
  canIndent: boolean;
  canAddChild: boolean;
  error: string | undefined;
  targets: MenuTargetsDto | undefined;
};

function ItemRowContent({
  entry,
  depth,
  isFirst,
  isLast,
  canIndent,
  canAddChild,
  error,
  targets,
  actions,
  handle,
}: RowState & { actions: ItemActions; handle: ComponentProps<"button"> }) {
  const t = useT();
  const text = useContentText();
  const { item } = entry;
  const summary = describeTarget(item, targets, text, t);
  const label = text(item.label) || t("Adsız element");
  return (
    <div
      className="flex min-h-14 items-center gap-2 py-1 pr-1"
      style={{ paddingLeft: `${depth * indent + 4}px` }}
    >
      <DragHandle label={t("{name}: yerini dəyiş", { name: label })} {...handle} />
      <div className="relative min-w-0 flex-1 py-1 text-meta">
        <button
          type="button"
          onClick={() => actions.onEdit(item.key)}
          className="block max-w-full truncate text-left font-medium after:absolute after:inset-0 hover:underline"
        >
          {label}
        </button>
        <span className="block truncate text-muted-foreground">{summary.text}</span>
        {summary.warning ? (
          <span className="flex items-start gap-1 text-muted-foreground">
            <CircleAlert className="mt-1 size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            {summary.warning}
          </span>
        ) : null}
        {error ? (
          <span role="alert" className="block text-destructive">
            {t.message(error)}
          </span>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("{name}: əməliyyatlar", { name: label })}
          >
            <Ellipsis strokeWidth={1.5} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem onSelect={() => actions.onEdit(item.key)}>
            <Pencil strokeWidth={1.5} />
            {t("Redaktə et")}
          </DropdownMenuItem>
          {canAddChild ? (
            <DropdownMenuItem onSelect={() => actions.onAddChild(item.key)}>
              <Plus strokeWidth={1.5} />
              {t("Alt element əlavə et")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem disabled={isFirst} onSelect={() => actions.onMove(item.key, -1)}>
            <ArrowUp strokeWidth={1.5} />
            {t("Yuxarı")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isLast} onSelect={() => actions.onMove(item.key, 1)}>
            <ArrowDown strokeWidth={1.5} />
            {t("Aşağı")}
          </DropdownMenuItem>
          {canIndent ? (
            <DropdownMenuItem onSelect={() => actions.onIndent(item.key)}>
              <CornerDownRight strokeWidth={1.5} />
              {t("Yuxarıdakının altına keçir")}
            </DropdownMenuItem>
          ) : null}
          {entry.depth > 0 ? (
            <DropdownMenuItem onSelect={() => actions.onOutdent(item.key)}>
              <CornerUpLeft strokeWidth={1.5} />
              {t("Bir səviyyə yuxarı çıxar")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => actions.onDelete(item.key)}>
            <Trash2 strokeWidth={1.5} />
            {t("Sil")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SortableItemRow({
  dragging,
  ...rest
}: RowState & { actions: ItemActions; dragging: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id: rest.entry.key });
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
      <ItemRowContent
        {...rest}
        handle={
          { ref: setActivatorNodeRef, ...attributes, ...listeners } as ComponentProps<"button">
        }
      />
    </li>
  );
}

export function MenuTreeList({
  items,
  maxDepth,
  targets,
  errors,
  actions,
  onChange,
}: {
  items: EditorItem[];
  maxDepth: number;
  targets: MenuTargetsDto | undefined;
  errors: Record<string, string>;
  actions: ItemActions;
  onChange: (items: EditorItem[]) => void;
}) {
  const t = useT();
  const text = useContentText();
  const sensors = useDragSensors();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);

  const flat = useMemo(() => flattenItems(items), [items]);
  const hidden = useMemo(() => {
    const active = activeKey ? flat.find((entry) => entry.key === activeKey) : undefined;
    return new Set(active ? flattenItems(active.item.children).map((entry) => entry.key) : []);
  }, [activeKey, flat]);
  const visible = flat.filter((entry) => !hidden.has(entry.key));
  const active = activeKey ? flat.find((entry) => entry.key === activeKey) : undefined;
  const offsetDepth = Math.round(offsetX / indent);
  const projected =
    activeKey && overKey ? projectDrop(visible, activeKey, overKey, offsetDepth, maxDepth) : null;
  const labels = new Map(flat.map((entry) => [entry.key, text(entry.item.label) || t("Element")]));

  function rowState(entry: FlatEditorItem): RowState {
    const siblings = flat.filter((other) => other.parentKey === entry.parentKey);
    const index = siblings.findIndex((other) => other.key === entry.key);
    const height = subtreeHeight(entry.item);
    return {
      entry,
      depth: entry.depth,
      isFirst: index === 0,
      isLast: index === siblings.length - 1,
      canIndent: index > 0 && entry.depth + 1 + height <= maxDepth,
      canAddChild: entry.depth < maxDepth,
      error: errors[entry.key],
      targets,
    };
  }

  function reset() {
    setActiveKey(null);
    setOverKey(null);
    setOffsetX(0);
  }

  function onDragStart({ active: dragged }: DragStartEvent) {
    setActiveKey(String(dragged.id));
    setOverKey(String(dragged.id));
    setOffsetX(0);
  }

  function onDragMove({ delta }: DragMoveEvent) {
    setOffsetX(delta.x);
  }

  function onDragOver({ over }: DragOverEvent) {
    setOverKey(over ? String(over.id) : null);
  }

  function onDragEnd({ active: dragged, over }: DragEndEvent) {
    const key = String(dragged.id);
    const projection = over
      ? projectDrop(visible, key, String(over.id), offsetDepth, maxDepth)
      : null;
    reset();
    if (!over || !projection) return;
    onChange(applyDrop(items, key, String(over.id), projection));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
      accessibility={{
        screenReaderInstructions: dragInstructions,
        announcements: dragAnnouncements((id) => labels.get(id) ?? t("Element")),
      }}
    >
      <SortableContext
        items={visible.map((entry) => entry.key)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="border border-border" aria-label={t("Menyu elementləri")}>
          {visible.map((entry) => (
            <SortableItemRow
              key={entry.key}
              {...rowState(entry)}
              depth={entry.key === activeKey && projected ? projected.depth : entry.depth}
              actions={actions}
              dragging={entry.key === activeKey}
            />
          ))}
        </ul>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className="border border-border bg-white shadow-md">
            <ItemRowContent {...rowState(active)} actions={actions} handle={{}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
