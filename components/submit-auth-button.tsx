"use client"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"

export function SubmitAuthButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus()
  return <Button type="submit" disabled={pending} className={className}>{pending ? "正在跳转…" : children}</Button>
}
