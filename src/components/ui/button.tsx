import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium tech-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground hover:scale-105 hover:shadow-glow glass-light border border-primary/20",
        destructive:
          "bg-gradient-to-r from-error/80 to-error text-destructive-foreground hover:from-error hover:to-error/90 glass-light border border-error/20",
        outline:
          "glass-light border border-primary/30 text-primary hover:bg-gradient-primary hover:text-primary-foreground hover:border-primary/50",
        secondary:
          "bg-gradient-secondary text-secondary-foreground hover:scale-105 hover:shadow-glow glass-light border border-secondary/20",
        accent:
          "bg-gradient-accent text-accent-foreground hover:scale-105 hover:shadow-glow glass-light border border-accent/20",
        ghost: "hover:bg-primary/10 hover:text-primary text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline text-gradient-primary",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-xl px-4",
        lg: "h-13 rounded-2xl px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
