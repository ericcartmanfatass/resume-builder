"use client"

import { useMemo } from "react"
import { buildResumeHtml } from "@/lib/export-html"
import type { ResumeData } from "@/types/resume"

interface HtmlResumePreviewProps {
  resumeData: ResumeData
  className?: string
  embedded?: boolean
}

export default function HtmlResumePreview({ resumeData, className, embedded = false }: HtmlResumePreviewProps) {
  const html = useMemo(() => buildResumeHtml(resumeData, { embedded }), [resumeData, embedded])

  return (
    <iframe
      key={resumeData.updatedAt}
      title="Resume HTML Preview"
      srcDoc={html}
      sandbox=""
      className={className ?? "block h-full w-full border-0 bg-white"}
    />
  )
}
