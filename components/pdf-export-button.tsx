"use client"

import { useState } from "react"
import { Icon } from "@iconify/react"
import { downloadResumePdf } from "@/lib/pdf-client"
import { getResumeSuggestions, validateResumeData } from "@/lib/resume-utils"
import { useToast } from "@/hooks/use-toast"
import type { ResumeData } from "@/types/resume"
import { Button } from "@/components/ui/button"
import { useAccount } from "@/components/account-provider"
import { ClientApiError } from "@/lib/api-client"

interface PDFExportButtonProps {
  resumeData: ResumeData
  variant?: "default" | "outline"
  size?: "default" | "sm"
  shareToken?: string
}

export function PDFExportButton({
  resumeData,
  variant = "default",
  size = "default",
  shareToken,
}: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()
  const { refresh, requireLogin, loading } = useAccount()

  const handleExport = async () => {
    if (isExporting) {
      return
    }

    const validation = validateResumeData(resumeData)
    if (!validation.isValid) {
      const visibleErrors = validation.errors.slice(0, 3)
      const remainingCount = validation.errors.length - visibleErrors.length

      toast({
        title: "无法导出 PDF",
        description: `${visibleErrors.join("；")}${remainingCount > 0 ? `，另有 ${remainingCount} 项问题` : ""}`,
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)
    try {
      const currentSession = await refresh()
      if (!currentSession) throw new Error("暂时无法确认导出额度，请稍后重试。")
      if (!currentSession.user && currentSession.loginRequired) { requireLogin(); return }
      const suggestions = getResumeSuggestions(resumeData)
      if (suggestions.length > 0) {
        toast({
          title: "已开始导出",
          description: `建议稍后补全：${suggestions.slice(0, 2).join("；")}${suggestions.length > 2 ? `，另有 ${suggestions.length - 2} 项` : ""}`,
        })
      }

      await downloadResumePdf(resumeData, shareToken)
      toast({
        title: "PDF 导出成功",
        description: "文件已开始下载。",
      })
    } catch (error) {
      if (error instanceof ClientApiError && (error.code === "LOGIN_REQUIRED" || error.status === 401)) {
        requireLogin()
        return
      }
      toast({
        title: "PDF 导出失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
      void refresh()
    }
  }

  return (
    <Button variant={variant} size={size} onClick={handleExport} disabled={isExporting || loading} className="gap-2">
      <Icon
        icon={isExporting ? "mdi:loading" : "mdi:file-pdf-box"}
        className={`h-4 w-4 ${isExporting ? "animate-spin" : ""}`}
      />
      {isExporting ? "生成中..." : "导出 PDF"}
    </Button>
  )
}

export default PDFExportButton
