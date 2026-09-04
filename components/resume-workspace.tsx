"use client"
import ResumeBuilder from "@/components/resume-builder"
import { useAccount } from "@/components/account-provider"
import { Button } from "@/components/ui/button"

export default function ResumeWorkspace() {
  const { session, loading, error, refresh } = useAccount()
  if (!session) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"><p>{loading ? "正在加载简历工作区…" : error || "暂时无法打开工作区。"}</p>{!loading && <Button onClick={() => void refresh()}>重新连接</Button>}</div>
  return <ResumeBuilder key={session.user?.id || "guest"} user={session.user} />
}
