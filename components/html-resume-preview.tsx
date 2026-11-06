"use client"

import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react"
import { buildResumeHtml } from "@/lib/export-html"
import type { ResumeData } from "@/types/resume"

interface HtmlResumePreviewProps {
  resumeData: ResumeData
  className?: string
  embedded?: boolean
  style?: CSSProperties
  activeSection?: string | null
  onSectionPosition?: (position: number) => void
}

function sectionKey(element: Element): string {
  if (element.matches(".resume-header")) return "header"
  const id = element.getAttribute("data-resume-module-id")
  return id === null ? "empty" : "module:" + id
}

// Patch only changed sections, keeping the frame, styles, avatar and scroll
// position stable. The PDF renderer still consumes buildResumeHtml directly.
function patchPage(document: Document, nextMarkup: string) {
  const current = document.querySelector("main.page")
  const next = new DOMParser().parseFromString(nextMarkup, "text/html").querySelector("main.page")
  if (!current || !next) return

  const previous = new Map(
    Array.from(current.children, (child): [string, Element] => [sectionKey(child), child]),
  )
  const expected = new Set<string>()

  Array.from(next.children).forEach((nextChild, index) => {
    const key = sectionKey(nextChild)
    expected.add(key)
    let child = previous.get(key)
    if (!child) {
      child = document.importNode(nextChild, true)
    } else if (key === "header") {
      // Editing contact details must not re-create an unchanged avatar image.
      const oldInfo = child.querySelector(".header-content")
      const newInfo = nextChild.querySelector(".header-content")
      if (oldInfo && newInfo && oldInfo.innerHTML !== newInfo.innerHTML) {
        oldInfo.innerHTML = newInfo.innerHTML
      }
      const oldAvatar = child.querySelector("img.avatar")
      const newAvatar = nextChild.querySelector("img.avatar")
      if (oldAvatar && !newAvatar) oldAvatar.remove()
      else if (!oldAvatar && newAvatar) child.appendChild(document.importNode(newAvatar, true))
      else if (oldAvatar && newAvatar && oldAvatar.outerHTML !== newAvatar.outerHTML) {
        oldAvatar.replaceWith(document.importNode(newAvatar, true))
      }
    } else if (child.innerHTML !== nextChild.innerHTML) {
      child.innerHTML = nextChild.innerHTML
    }

    const atIndex = current.children.item(index)
    if (child !== atIndex) current.insertBefore(child, atIndex)
  })

  for (const child of Array.from(current.children)) {
    if (!expected.has(sectionKey(child))) child.remove()
  }
}

export default function HtmlResumePreview({
  resumeData,
  className,
  embedded = false,
  style,
  activeSection,
  onSectionPosition,
}: HtmlResumePreviewProps) {
  const html = useMemo(() => buildResumeHtml(resumeData, { embedded }), [resumeData, embedded])
  const initialHtmlRef = useRef(html)
  const latestHtmlRef = useRef(html)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const sectionRef = useRef(activeSection)
  const positionRef = useRef(onSectionPosition)
  latestHtmlRef.current = html
  sectionRef.current = activeSection
  positionRef.current = onSectionPosition

  const updateFrame = useCallback(() => {
    const document = frameRef.current?.contentDocument
    if (document) patchPage(document, latestHtmlRef.current)
  }, [])

  const followSection = useCallback(() => {
    const section = sectionRef.current
    const frame = frameRef.current
    const doc = frame?.contentDocument
    const innerWindow = frame?.contentWindow
    if (!section || !frame || !doc || !innerWindow) return

    const destination = section === "header"
      ? doc.querySelector(".resume-header")
      : Array.from(doc.querySelectorAll("[data-resume-module-id]")).find(
          (element) => element.getAttribute("data-resume-module-id") === section,
        )
    if (!destination) return

    const top = destination.getBoundingClientRect().top + innerWindow.scrollY
    const contentHeight = Math.max(doc.body?.scrollHeight || 0, doc.documentElement.scrollHeight)
    const maxScroll = Math.max(0, contentHeight - frame.clientHeight)
    const scrollTop = Math.min(Math.max(0, top - 24), maxScroll)

    innerWindow.scrollTo({ top: scrollTop, behavior: "auto" })
    // In the scaled phone preview, the outer viewport may also need to scroll.
    positionRef.current?.(Math.max(0, top - scrollTop - 24))
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(updateFrame)
    return () => cancelAnimationFrame(frame)
  }, [html, updateFrame])

  useEffect(() => {
    const frame = requestAnimationFrame(followSection)
    return () => cancelAnimationFrame(frame)
  }, [activeSection, followSection])

  return (
    <iframe
      ref={frameRef}
      title="Resume HTML Preview"
      // Parent updates the preview DOM; sandboxed content cannot run scripts.
      sandbox="allow-same-origin"
      srcDoc={initialHtmlRef.current}
      onLoad={() => {
        updateFrame()
        followSection()
      }}
      style={style}
      className={className ?? "block h-full w-full border-0 bg-white"}
    />
  )
}
