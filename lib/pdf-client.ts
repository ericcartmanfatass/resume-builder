"use client"

import { generatePdfFilename } from "@/lib/resume-utils"
import type { ResumeData } from "@/types/resume"
import { browserFingerprint } from "@/lib/fingerprint"
import { ClientApiError } from "@/lib/api-client"

export async function downloadResumePdf(resumeData: ResumeData, shareToken?: string) {
  const fingerprint = await browserFingerprint()
  const response = await fetch("/api/export/pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(fingerprint ? { "X-Guest-Fingerprint": fingerprint } : {}),
    },
    body: JSON.stringify(shareToken ? { shareToken } : { resumeData }),
  })

  if (!response.ok) {
    let details = "PDF 生成失败"
    let code = "EXPORT_FAILED"

    try {
      const payload = await response.json()
      details = payload.details || payload.error || details
      code = payload.code || code
    } catch {
      details = response.statusText || details
    }

    throw new ClientApiError(response.status, code, details)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = generatePdfFilename(resumeData.title)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
