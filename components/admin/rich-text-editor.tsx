"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import {
  BetweenHorizontalEnd,
  BetweenVerticalEnd,
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Table2,
  TextQuote,
  Trash2,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { richTextExtensions } from "@/lib/content/extensions";
import type { RichTextDoc } from "@/lib/content/rich-text";
import type { MessageKey } from "@/lib/admin/i18n";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/admin/i18n/use-t";

import { MediaPickerDialog } from "./image-picker";

function ToolbarButton({
  icon: Icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: MessageKey;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const t = useT();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={t(label)}
      title={t(label)}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={active ? "bg-chip" : undefined}
    >
      <Icon strokeWidth={1.5} />
    </Button>
  );
}

function LinkControl({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");
  const t = useT();
  const active = editor.isActive("link");

  function apply() {
    const value = href.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!value) chain.unsetLink().run();
    else {
      const url = /^(https?:|mailto:|tel:|\/)/.test(value) ? value : `https://${value}`;
      chain.setLink({ href: url }).run();
    }
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setHref((editor.getAttributes("link").href as string | undefined) ?? "");
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("Keçid")}
          title={t("Keçid")}
          aria-pressed={active}
          className={active ? "bg-chip" : undefined}
        >
          <Link2 strokeWidth={1.5} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3">
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
        >
          <label className="text-meta font-medium" htmlFor="rich-text-link">
            {t("Keçid ünvanı")}
          </label>
          <Input
            id="rich-text-link"
            value={href}
            onChange={(event) => setHref(event.target.value)}
            placeholder="https://"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            {active ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().extendMarkRange("link").unsetLink().run();
                  setOpen(false);
                }}
              >
                <Unlink strokeWidth={1.5} />
                {t("Keçidi sil")}
              </Button>
            ) : null}
            <Button type="submit" size="sm">
              {t("Tətbiq et")}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function TableControl({ editor }: { editor: Editor }) {
  const t = useT();
  if (!editor.isActive("table")) {
    return (
      <ToolbarButton
        icon={Table2}
        label="Cədvəl əlavə et"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      />
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("Cədvəl")}
          title={t("Cədvəl")}
          aria-pressed
          onMouseDown={(event) => event.preventDefault()}
          className="bg-chip"
        >
          <Table2 strokeWidth={1.5} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuItem onSelect={() => editor.chain().focus().addRowAfter().run()}>
          <BetweenHorizontalEnd strokeWidth={1.5} />
          {t("Aşağıya sətir əlavə et")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => editor.chain().focus().addColumnAfter().run()}>
          <BetweenVerticalEnd strokeWidth={1.5} />
          {t("Sağa sütun əlavə et")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!editor.can().deleteRow()}
          onSelect={() => editor.chain().focus().deleteRow().run()}
        >
          <Trash2 strokeWidth={1.5} />
          {t("Sətri sil")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!editor.can().deleteColumn()}
          onSelect={() => editor.chain().focus().deleteColumn().run()}
        >
          <Trash2 strokeWidth={1.5} />
          {t("Sütunu sil#table")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => editor.chain().focus().deleteTable().run()}
        >
          <Trash2 strokeWidth={1.5} />
          {t("Cədvəli sil")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RichTextEditor({
  value,
  onChange,
  id,
  invalid,
  describedBy,
  minimal = false,
}: {
  value: RichTextDoc | null | undefined;
  onChange: (value: RichTextDoc) => void;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
  minimal?: boolean;
}) {
  const [picking, setPicking] = useState(false);
  const t = useT();
  const editor = useEditor({
    extensions: richTextExtensions,
    content: value ?? null,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: "textbox",
        "aria-multiline": "true",
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
        class: cn(
          "min-h-32 px-3 py-2 text-base outline-none md:text-meta",
          "[&_a]:text-graphite [&_a]:underline [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_h2]:mt-4 [&_h2]:text-card [&_h3]:mt-3 [&_h3]:font-medium [&_img]:my-2 [&_img]:max-h-64 [&_img]:w-auto [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_strong]:font-medium [&_ul]:list-disc [&_ul]:pl-6",
          "[&_.selectedCell]:bg-accent [&_.tableWrapper]:my-2 [&_.tableWrapper]:overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_td_p]:my-0 [&_th]:border [&_th]:border-border [&_th]:bg-surface [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:align-top [&_th]:font-medium [&_th_p]:my-0",
        ),
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as RichTextDoc),
  });

  return (
    <div
      className={cn(
        "rounded-sm border border-input bg-white focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
        invalid ? "border-destructive" : null,
      )}
    >
      {editor ? (
        <div
          role="toolbar"
          aria-label={t("Mətn formatı")}
          className="flex flex-wrap gap-0.5 border-b border-border p-1"
        >
          {minimal ? null : (
            <>
              <ToolbarButton
                icon={Pilcrow}
                label="Adi mətn"
                active={editor.isActive("paragraph")}
                onClick={() => editor.chain().focus().setParagraph().run()}
              />
              <ToolbarButton
                icon={Heading2}
                label="Başlıq 2"
                active={editor.isActive("heading", { level: 2 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              />
              <ToolbarButton
                icon={Heading3}
                label="Başlıq 3"
                active={editor.isActive("heading", { level: 3 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              />
            </>
          )}
          <ToolbarButton
            icon={Bold}
            label="Qalın"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            icon={Italic}
            label="Kursiv"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <LinkControl editor={editor} />
          <ToolbarButton
            icon={List}
            label="Siyahı"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            icon={ListOrdered}
            label="Nömrəli siyahı"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          {minimal ? null : (
            <>
              <ToolbarButton
                icon={TextQuote}
                label="Sitat"
                active={editor.isActive("blockquote")}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              />
              <TableControl editor={editor} />
              <ToolbarButton icon={ImagePlus} label="Şəkil" onClick={() => setPicking(true)} />
            </>
          )}
        </div>
      ) : (
        <div className="h-11 border-b border-border lg:h-10" />
      )}
      <EditorContent editor={editor} />
      {minimal ? null : (
        <MediaPickerDialog
          open={picking}
          onOpenChange={setPicking}
          kind="image"
          title={t("Mətnə şəkil əlavə edin")}
          onConfirm={([media]) => {
            if (!media || !editor) return;
            editor
              .chain()
              .focus()
              .setImage({ src: media.src, alt: media.alt ?? "" })
              .run();
          }}
        />
      )}
    </div>
  );
}
