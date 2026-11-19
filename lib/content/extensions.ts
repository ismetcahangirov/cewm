import Image from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";

export const richTextExtensions = [
  StarterKit.configure({
    link: { openOnClick: false },
    code: false,
    codeBlock: false,
    strike: false,
    underline: false,
  }),
  Image.configure({ inline: false }),
  Table.configure({ resizable: false, allowTableNodeSelection: false }),
  TableRow,
  TableHeader,
  TableCell,
];
