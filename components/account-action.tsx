"use client"

import type { ButtonHTMLAttributes } from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function AccountAction({ icon: Icon, label, description, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon
  label: string
  description?: string
}) {
  return <button type="button" className={cn("group flex w-full items-center gap-3 rounded-lg px-3 py-3.5 text-left transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", className)} {...props}>
    <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium">{label}</span>
      {description && <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>}
    </span>
    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
  </button>
}
