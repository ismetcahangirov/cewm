"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

import { translate, type MessageKey } from "@/lib/admin/i18n";
import { currentAdminLocale } from "@/lib/admin/i18n/current";
import type { MessageParams } from "@/lib/admin/i18n/translate";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/admin/i18n/use-t";

function say(key: MessageKey, params?: MessageParams): string {
  return translate(currentAdminLocale(), key, params);
}

export const dragInstructions: ScreenReaderInstructions = {
  get draggable() {
    return say(
      "Elementi götürmək üçün boşluq və ya Enter düyməsini basın. Ox düymələri ilə yerini dəyişin, yenidən boşluq və ya Enter ilə buraxın, Escape ilə ləğv edin.",
    );
  },
};

export function dragAnnouncements(label: (id: string) => string): Announcements {
  return {
    onDragStart: ({ active }) => say("{item} götürüldü.", { item: label(String(active.id)) }),
    onDragOver: ({ active, over }) =>
      over
        ? say("{item} {target} yerinə keçir.", {
            item: label(String(active.id)),
            target: label(String(over.id)),
          })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? say("{item} yerləşdirildi.", { item: label(String(active.id)) })
        : say("{item} buraxıldı.", { item: label(String(active.id)) }),
    onDragCancel: ({ active }) =>
      say("{item} köçürülməsi ləğv edildi.", { item: label(String(active.id)) }),
  };
}

export function useDragSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

export type SortableRenderProps = {
  handle: ComponentProps<"button">;
  dragging: boolean;
};

function SortableEntry({
  id,
  children,
  className,
}: {
  id: string;
  children: (props: SortableRenderProps) => ReactNode;
  className?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(className, isDragging ? "relative z-10 opacity-80" : null)}
    >
      {children({
        dragging: isDragging,
        handle: {
          ref: setActivatorNodeRef,
          ...attributes,
          ...listeners,
        } as ComponentProps<"button">,
      })}
    </li>
  );
}

export function SortableList<Item>({
  items,
  getId,
  getLabel,
  onReorder,
  children,
  layout = "list",
  className,
  itemClassName,
}: {
  items: Item[];
  getId: (item: Item) => string;
  getLabel: (item: Item) => string;
  onReorder: (from: number, to: number) => void;
  children: (item: Item, index: number, props: SortableRenderProps) => ReactNode;
  layout?: "list" | "grid";
  className?: string;
  itemClassName?: string;
}) {
  const sensors = useDragSensors();
  const ids = items.map(getId);
  const labels = new Map(items.map((item) => [getId(item), getLabel(item)]));

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) onReorder(from, to);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: dragInstructions,
        announcements: dragAnnouncements((id) => labels.get(id) ?? "Element"),
      }}
    >
      <SortableContext
        items={ids}
        strategy={layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
      >
        <ul className={className}>
          {items.map((item, index) => (
            <SortableEntry key={getId(item)} id={getId(item)} className={itemClassName}>
              {(props) => children(item, index, props)}
            </SortableEntry>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

export function DragHandle({
  label,
  className,
  ...props
}: ComponentProps<"button"> & { label: string }) {
  const t = useT();
  return (
    <button
      type="button"
      aria-label={label}
      title={t("Sürüşdürərək yerini dəyişin")}
      className={cn(
        "flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary active:cursor-grabbing md:size-9",
        className,
      )}
      {...props}
    >
      <GripVertical className="size-4" strokeWidth={1.5} />
    </button>
  );
}

export { arrayMove };
