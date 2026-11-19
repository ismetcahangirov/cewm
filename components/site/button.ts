import { cva, type VariantProps } from "class-variance-authority";

export const button = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2.5 rounded-sm px-5 text-small font-medium whitespace-nowrap transition-colors duration-200",
  {
    variants: {
      variant: {
        filled: "bg-navy text-white hover:bg-cyan hover:text-navy",
        outline: "border border-navy text-navy hover:bg-navy hover:text-white",
      },
    },
    defaultVariants: { variant: "filled" },
  },
);

export type ButtonVariant = VariantProps<typeof button>["variant"];
