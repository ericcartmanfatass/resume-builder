"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import type { AccountSession } from "@/types/account"
import { browserFingerprint } from "@/lib/fingerprint"
import { apiRequest } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type AccountContextValue = {
  session: AccountSession | null
  loading: boolean
  error: string | null
  refresh: () => Promise<AccountSession | null>
  requireLogin: () => void
  signIn: () => void
  confirm: (message: string) => Promise<boolean>
}
const AccountContext = createContext<AccountContextValue | null>(null)

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AccountSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loginPrompt, setLoginPrompt] = useState(false)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const confirmResult = useRef<((accepted: boolean) => void) | null>(null)
  const confirm = useCallback((message: string) => new Promise<boolean>((resolve) => {
    confirmResult.current?.(false)
    confirmResult.current = resolve
    setConfirmation(message)
  }), [])
  const finishConfirmation = (accepted: boolean) => {
    confirmResult.current?.(accepted)
    confirmResult.current = null
    setConfirmation(null)
  }
  const inFlight = useRef<Promise<AccountSession | null> | null>(null)
  const refresh = useCallback(() => {
    if (inFlight.current) return inFlight.current
    const promise = (async () => {
      try {
        const fingerprint = await browserFingerprint()
        const next = await apiRequest<AccountSession>("/api/session", { headers: fingerprint ? { "X-Guest-Fingerprint": fingerprint } : {} })
        setSession(next)
        setError(null)
        return next
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "暂时无法获取账号状态。")
        return null
      } finally { setLoading(false); inFlight.current = null }
    })()
    inFlight.current = promise
    return promise
  }, [])
  useEffect(() => {
    void refresh()
    const onFocus = () => { void refresh() }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refresh])
  const signIn = useCallback(() => {
    window.dispatchEvent(new Event("resume:flush-draft"))
    window.location.assign("/sign-in")
  }, [])

  return <AccountContext.Provider value={{ session, loading, error, refresh, signIn, confirm, requireLogin: () => setLoginPrompt(true) }}>
    {children}
    <Dialog open={loginPrompt} onOpenChange={setLoginPrompt}>
      <DialogContent>
        <DialogHeader><DialogTitle>登录后继续</DialogTitle><DialogDescription>登录后可不限次数导出，并使用云端保存和分享。当前草稿会保留在此浏览器中。</DialogDescription></DialogHeader>
        <Button onClick={signIn} disabled={session?.loginEnabled === false}>{session?.loginEnabled === false ? "登录服务暂未开放" : "登录 / 注册"}</Button>
      </DialogContent>
    </Dialog>
    <Dialog open={confirmation !== null} onOpenChange={(open) => { if (!open) finishConfirmation(false) }}>
      <DialogContent>
        <DialogHeader><DialogTitle>确认操作</DialogTitle><DialogDescription>{confirmation}</DialogDescription></DialogHeader>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => finishConfirmation(false)}>取消</Button><Button onClick={() => finishConfirmation(true)}>确认继续</Button></div>
      </DialogContent>
    </Dialog>
  </AccountContext.Provider>
}

export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) throw new Error("AccountProvider is required")
  return context
}
