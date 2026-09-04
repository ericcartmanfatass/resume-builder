import Link from "next/link"
import { startSignIn } from "@/app/auth-actions"
import { authConfigured } from "@/lib/server/config"
import { SubmitAuthButton } from "@/components/submit-auth-button"

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <section className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">登录，继续打造你的简历</h1>
          <p className="text-sm leading-6 text-muted-foreground">保存到云端，随时继续编辑；分享在线简历，并享受不限次数的 PDF 导出。</p>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">登录未完成或已过期，请重新登录。</p>}
        {authConfigured() ? (
          <form action={startSignIn}><SubmitAuthButton className="w-full">登录 / 注册</SubmitAuthButton></form>
        ) : <p role="alert" className="text-sm text-muted-foreground">登录服务暂未开放，请稍后再试。</p>}
        <Link href="/" className="block text-center text-sm text-muted-foreground underline underline-offset-4">返回编辑器</Link>
      </section>
    </main>
  )
}
