import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        jupiterPrimary:
          "relative overflow-hidden border-indigo-300/55 bg-[linear-gradient(135deg,#2469e8_0%,#4a51d8_55%,#733ee0_100%)] text-white shadow-[inset_0_1px_rgba(255,255,255,.28),inset_0_-1px_rgba(14,17,72,.35),0_10px_28px_rgba(46,64,190,.3)] text-shadow-[0_1px_1px_rgba(0,0,0,.22)] hover:-translate-y-px hover:brightness-110 hover:shadow-[inset_0_1px_rgba(255,255,255,.34),0_0_22px_rgba(83,99,255,.28),0_13px_32px_rgba(30,42,142,.38)] active:translate-y-px",
        jupiterSecondary:
          "border-slate-300/15 bg-[linear-gradient(145deg,rgba(28,37,55,.9),rgba(10,15,25,.94))] text-slate-100 shadow-[inset_0_1px_rgba(255,255,255,.06),0_8px_22px_rgba(0,0,0,.18)] hover:border-indigo-300/30 hover:bg-[linear-gradient(145deg,rgba(42,55,88,.92),rgba(18,22,37,.96))] hover:text-white",
        jupiterQuiet:
          "border-transparent bg-transparent text-slate-300/65 hover:border-indigo-300/20 hover:bg-[linear-gradient(145deg,rgba(63,89,175,.15),rgba(113,66,191,.1))] hover:text-white",
        jupiterDanger:
          "border-red-300/25 bg-[linear-gradient(145deg,rgba(127,29,29,.62),rgba(68,18,28,.78))] text-red-50 shadow-[inset_0_1px_rgba(255,255,255,.1),0_8px_22px_rgba(56,8,16,.22)] hover:border-red-200/40 hover:brightness-110",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 rounded-[11px] px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
