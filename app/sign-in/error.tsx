"use client"
import Link from "next/link"

export default function SignInError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-md space-y-4 p-8"><h1 className="text-xl font-semibold">暂时无法连接登录服务</h1><p>草稿仍保留在此浏览器中，请稍后重试。</p><button onClick={reset} className="underline">重试</button><Link href="/" className="ml-6 underline">返回编辑器</Link></main>
}
