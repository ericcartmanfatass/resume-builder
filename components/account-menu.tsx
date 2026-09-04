"use client"
import type { ReactNode } from "react"
import { ChevronDown, LogIn, LogOut, UserRound } from "lucide-react"
import { endSession } from "@/app/auth-actions"
import { useAccount } from "@/components/account-provider"
import { AccountAction } from "@/components/account-action"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export function AccountMenu({ children }: { children?: ReactNode }) {
  const { session, loading, error, signIn, refresh } = useAccount()
  return <Sheet>
    <SheetTrigger asChild>
      <button type="button" className="group flex shrink-0 items-center gap-2 rounded-full p-1 text-sm transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="个人中心" title="个人中心">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="h-4 w-4" /></span>
        <span className="hidden max-w-24 truncate sm:inline">{session?.user?.name || "个人中心"}</span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" aria-hidden="true" />
        {error && <span className="h-2 w-2 rounded-full bg-destructive" aria-label="账号服务异常" />}
      </button>
    </SheetTrigger>
    <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
      <SheetHeader className="border-b p-6 pr-12">
        <SheetTitle>个人中心</SheetTitle>
        <SheetDescription>管理账号、云端简历与分享。</SheetDescription>
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <section className="flex items-center gap-3 rounded-xl bg-muted/50 p-4" aria-label="账号信息">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="truncate font-medium">{session?.user?.name || "游客"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{loading ? "正在获取账号状态…" : session?.user ? "正式用户 · 导出不限次数" : session ? `剩余 ${session.remainingExports ?? 0} 次免费导出` : "账号状态暂不可用"}</p>
          </div>
        </section>
        {!loading && !session?.user && <div className="space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">登录后可保存云端简历、分享在线预览，并享受不限次数的 PDF 导出。</p>
          <AccountAction icon={LogIn} label="登录 / 注册" onClick={signIn} disabled={session?.loginEnabled === false} />
        </div>}
        {error && <button className="text-left text-sm text-destructive underline" onClick={() => void refresh()}>服务连接失败，点击重试</button>}
        {children}
        {session?.user && <form className="mt-auto border-t pt-4" action={endSession} onSubmit={() => { window.dispatchEvent(new Event("resume:flush-draft")); sessionStorage.removeItem("resumeData") }}><AccountAction type="submit" icon={LogOut} label="退出登录" /></form>}
      </div>
    </SheetContent>
  </Sheet>
}
