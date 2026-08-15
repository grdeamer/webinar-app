"use client"

import * as React from "react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group
const DropdownMenuPortal = DropdownMenuPrimitive.Portal

function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPortal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[210px] overflow-hidden rounded-[12px] border border-white/[0.12] bg-[#08101d]/98 p-1.5 text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
          className
        )}
        {...props}
      />
    </DropdownMenuPortal>
  )
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        "px-2.5 pb-1.5 pt-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#72829d]",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  destructive = false,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  destructive?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "group flex min-h-9 cursor-default select-none items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[12px] outline-none transition",
        "data-[highlighted]:bg-white/[0.075] data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        destructive
          ? "text-red-300 data-[highlighted]:bg-red-400/[0.09] data-[highlighted]:text-red-200"
          : "text-slate-200 data-[highlighted]:text-white",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-white/[0.08]", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
}
