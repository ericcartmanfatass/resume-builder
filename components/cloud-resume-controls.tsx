"use client"

import { useEffect, useState } from "react"
import { Files, CloudUpload, Share2 } from "lucide-react"
import { AccountAction } from "@/components/account-action"
import type { CloudResumeControls as Controls } from "@/hooks/use-cloud-resume"
import { useAccount } from "@/components/account-provider"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function CloudResumeControls({ cloud, ready }: { cloud: Controls; ready: boolean }) {
  const { session, confirm } = useAccount()
  const { toast } = useToast()
  const [listOpen, setListOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [customToken, setCustomToken] = useState("")
  const [customTokenError, setCustomTokenError] = useState("")
  const notifyError = (cause: unknown) => toast({ title: "操作未完成", description: cause instanceof Error ? cause.message : "请稍后重试。", variant: "destructive" })
  const shareUrl = cloud.active?.shareToken && typeof window !== "undefined" ? `${window.location.origin}/s/${cloud.active.shareToken}` : ""
  const sharePrefix = typeof window !== "undefined" ? `${window.location.origin}/s/` : "/s/"
  useEffect(() => {
    if (!shareOpen) return
    setCustomToken(cloud.active?.customShareToken || "")
    setCustomTokenError("")
  }, [shareOpen, cloud.active?.id, cloud.active?.customShareToken])

  const publishShare = async () => {
    const normalized = customToken.trim().toLowerCase()
    if (normalized && !/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(normalized)) {
      setCustomTokenError("请输入 3–30 位小写字母、数字或连字符，且不能以连字符开头或结尾。")
      return
    }
    setCustomTokenError("")
    try {
      await cloud.publish(normalized || null)
      toast({ title: "分享已发布", description: normalized ? "自定义链接已保留，云端保存后分享内容会同步更新。" : "云端保存后，分享内容会同步更新。" })
    } catch (cause) {
      notifyError(cause)
    }
  }

  if (!session?.user) return null
  return <>
    <section className="space-y-3" aria-label="云端简历管理">
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">简历与分享</h3><span className="text-xs text-muted-foreground" role="status">{cloud.status}</span></div>
    <div className="divide-y divide-border/60">
    <AccountAction icon={Files} label="云端简历" description="管理已保存的简历与在线预览" disabled={!ready || cloud.busy} onClick={() => { setListOpen(true); void cloud.refreshList().catch(notifyError) }} />
    <AccountAction icon={CloudUpload} label={cloud.busy ? "同步中…" : cloud.active ? "保存云端" : "保存到云端"} description="同步当前草稿，随时继续编辑" disabled={!ready || cloud.busy} onClick={() => void cloud.save().catch(notifyError)} />
    <AccountAction icon={Share2} label="分享" description="发布、更新或关闭简历分享链接" disabled={!ready || cloud.busy} onClick={() => setShareOpen(true)} />
    </div>
    {cloud.error && <div role="alert" className="flex basis-full flex-wrap items-center gap-2 text-xs text-destructive">
      <span>{cloud.error}</span>
      <button className="underline" disabled={cloud.busy} onClick={() => void cloud.save(true).catch(notifyError)}>另存云端副本</button>
      {cloud.active && <button className="underline" disabled={cloud.busy} onClick={async () => { if (await confirm("重新打开云端版本将替换当前本地草稿。建议先下载本地文件备份，是否继续？")) void cloud.load(cloud.active!.id, true).catch(notifyError) }}>重新打开云端版本</button>}
    </div>}
    </section>
    <Dialog open={listOpen} onOpenChange={setListOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>我的云端简历</DialogTitle><DialogDescription>打开后自动保存到云端；已开启分享的内容会随云端保存同步更新。</DialogDescription></DialogHeader>
        <div className="max-h-[55vh] space-y-3 overflow-y-auto">
          {cloud.resumes.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">还没有云端简历，点击“保存到云端”保存当前草稿。</p>}
          {cloud.resumes.map((resume) => <div key={resume.id} className="space-y-3 rounded-lg border p-3">
            <div><p className="truncate font-medium">{resume.title || "未命名简历"}{cloud.active?.id === resume.id && <span className="ml-2 text-xs text-muted-foreground">当前</span>}</p><p className="text-xs text-muted-foreground">{new Date(resume.updatedAt).toLocaleString("zh-CN")}{resume.shareToken ? " · 已分享" : resume.customShareToken ? " · 自定义链接已保留" : " · 仅自己可见"}</p></div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={cloud.busy} onClick={async () => {
                if ((!cloud.active || cloud.error) && !(await confirm("打开云端简历将替换当前本地草稿。请确认已保存或下载需要保留的内容。"))) return
                void cloud.load(resume.id, Boolean(cloud.error)).then(() => setListOpen(false)).catch(notifyError)
              }}>打开编辑</Button>
              <Button size="sm" variant="outline" asChild><a href={`/resumes/${resume.id}`} target="_blank" rel="noopener noreferrer">在线预览</a></Button>
              <Button size="sm" variant="outline" disabled={cloud.busy} onClick={async () => { if (await confirm(`删除“${resume.title || "未命名简历"}”？对应分享链接也会失效，此操作无法撤销。`)) void cloud.remove(resume.id).catch(notifyError) }}>删除</Button>
            </div>
          </div>)}
        </div>
        <Button variant="outline" disabled={cloud.busy} onClick={() => void cloud.save(true).then(() => setListOpen(false)).catch(notifyError)}>将当前草稿另存为新简历</Button>
      </DialogContent>
    </Dialog>
    <Dialog open={shareOpen} onOpenChange={setShareOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>分享简历</DialogTitle><DialogDescription>任何拿到链接的人都可以查看简历，包括联系方式。分享开启后，每次云端保存都会同步更新链接中的内容。</DialogDescription></DialogHeader>
        <div className="space-y-2">
          <label htmlFor="custom-share-token" className="text-sm font-medium">自定义链接 <span className="font-normal text-muted-foreground">（可选）</span></label>
          <div className="flex items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring/50">
            <span className="max-w-[55%] shrink-0 truncate border-r px-3 text-sm text-muted-foreground" title={sharePrefix}>{sharePrefix}</span>
            <Input id="custom-share-token" value={customToken} onChange={(event) => { setCustomToken(event.target.value.toLowerCase()); setCustomTokenError("") }} placeholder="your-name" maxLength={30} className="border-0 shadow-none focus-visible:ring-0" aria-invalid={Boolean(customTokenError)} />
          </div>
          {customTokenError ? <p className="text-xs text-destructive">{customTokenError}</p> : <p className="text-xs text-muted-foreground/50">留空使用随机链接；自定义链接关闭分享后仍会为你保留。</p>}
        </div>
        {shareUrl && <div className="space-y-3"><Input aria-label="分享链接" readOnly value={shareUrl} onFocus={(event) => event.target.select()} /><div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(shareUrl).then(() => toast({ title: "链接已复制" })).catch(() => toast({ title: "请选中上方链接手动复制" }))}>复制链接</Button>
          <Button size="sm" variant="outline" asChild><a href={shareUrl} target="_blank" rel="noopener noreferrer">打开预览</a></Button>
          <Button size="sm" variant="outline" disabled={cloud.busy} onClick={() => void cloud.revoke().catch(notifyError)}>关闭分享</Button>
        </div></div>}
        <Button disabled={cloud.busy || !ready} onClick={() => void publishShare()}>{cloud.busy ? "正在发布…" : shareUrl ? "保存并更新分享" : "保存并创建分享链接"}</Button>
      </DialogContent>
    </Dialog>
  </>
}
