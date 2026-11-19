import { cva, type VariantProps } from "class-variance-authority";

export const button = cva(
  "group/button inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-xs px-6 text-center text-small font-medium transition-colors duration-200 ease-standard active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40",
  {
    variants: {
      variant: {
        filled: "hover:bg-navy-raised bg-navy text-white",
        outline: "text-ink hover:border-ink border border-line-strong",
        accent: "text-ink bg-cyan hover:bg-white",
        ghost: "border border-white/40 text-white hover:border-white",
      },
    },
    defaultVariants: { variant: "filled" },
  },
);

export const buttonArrow =
  "shrink-0 transition-transform duration-200 ease-standard group-hover/button:translate-x-1 group-focus-visible/button:translate-x-1";

export type ButtonVariant = VariantProps<typeof button>["variant"];
