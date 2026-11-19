import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent text-small whitespace-nowrap transition-colors duration-300 outline-none select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary font-medium text-primary-foreground hover:bg-sand hover:text-black",
        outline: "border-graphite bg-background text-heading hover:bg-graphite hover:text-white",
        secondary: "bg-secondary text-secondary-foreground hover:bg-chip",
        ghost: "rounded-sm hover:bg-secondary",
        destructive: "border-destructive text-destructive hover:bg-destructive hover:text-white",
        link: "text-graphite underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 md:h-10",
        sm: "h-10 px-4 md:h-9",
        lg: "h-12 px-8",
        icon: "size-11 md:size-10",
        "icon-sm": "size-11 rounded-sm md:size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
