"use client"

import { useMemo, type CSSProperties } from "react"
import { buildResumeHtml } from "@/lib/export-html"
import type { ResumeData } from "@/types/resume"

interface HtmlResumePreviewProps {
  resumeData: ResumeData
  className?: string
  embedded?: boolean
  style?: CSSProperties
}

export default function HtmlResumePreview({ resumeData, className, embedded = false, style }: HtmlResumePreviewProps) {
  const html = useMemo(() => buildResumeHtml(resumeData, { embedded }), [resumeData, embedded])

  return (
    <iframe
      key={resumeData.updatedAt}
      title="Resume HTML Preview"
      srcDoc={html}
      sandbox=""
      style={style}
      className={className ?? "block h-full w-full border-0 bg-white"}
    />
  )
}
