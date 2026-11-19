import { cva, type VariantProps } from "class-variance-authority";

export const pill = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2.5 rounded-full px-5 text-small whitespace-nowrap transition-colors duration-300",
  {
    variants: {
      variant: {
        outline: "border border-graphite text-heading hover:bg-graphite hover:text-white",
        "outline-light": "border border-sand text-sand hover:bg-sand hover:text-graphite",
        filled: "bg-graphite font-medium text-white hover:bg-sand hover:text-graphite",
        white: "bg-white text-heading hover:bg-graphite hover:text-white",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

export type PillVariant = VariantProps<typeof pill>["variant"];
