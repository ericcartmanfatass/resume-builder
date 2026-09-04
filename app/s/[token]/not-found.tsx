import Link from "next/link"

export default function ShareNotFound() {
  return <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"><h1 className="text-2xl font-semibold">分享链接已失效</h1><p className="text-muted-foreground">此简历不存在，或作者已关闭分享。</p><Link href="/" className="underline">打开简历编辑器</Link></main>
}
