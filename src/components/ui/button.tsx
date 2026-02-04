import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: 
          "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-md shadow-primary/25 hover:from-primary/95 hover:to-primary/80 hover:shadow-lg hover:shadow-primary/30 border border-primary/20",
        destructive: 
          "bg-gradient-to-b from-destructive to-destructive/85 text-destructive-foreground shadow-md shadow-destructive/25 hover:from-destructive/95 hover:to-destructive/80 hover:shadow-lg hover:shadow-destructive/30 border border-destructive/20",
        outline: 
          "border-2 border-primary/30 bg-background text-primary shadow-sm hover:bg-primary/5 hover:border-primary/50 hover:shadow-md",
        secondary: 
          "bg-gradient-to-b from-secondary to-secondary/90 text-secondary-foreground shadow-sm hover:from-secondary/95 hover:to-secondary/85 hover:shadow-md border border-border/50",
        ghost: 
          "text-foreground hover:bg-accent/80 hover:text-accent-foreground",
        link: 
          "text-primary underline-offset-4 hover:underline font-semibold",
        // New premium variants
        premium:
          "bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 border border-white/10",
        success:
          "bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-600/25 hover:from-emerald-500 hover:to-emerald-600 hover:shadow-lg border border-emerald-500/20",
        warning:
          "bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 hover:shadow-lg border border-amber-400/20",
        dark:
          "bg-gradient-to-b from-slate-800 to-slate-900 text-white shadow-md shadow-slate-900/30 hover:from-slate-700 hover:to-slate-800 hover:shadow-lg border border-slate-700/30",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-7 text-base",
        xl: "h-14 rounded-xl px-8 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
