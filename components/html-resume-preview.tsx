"use client"

import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react"
import { buildResumeHtml } from "@/lib/export-html"
import type { ResumeData } from "@/types/resume"

interface HtmlResumePreviewProps {
  resumeData: ResumeData
  className?: string
  embedded?: boolean
  style?: CSSProperties
  navigation?: { section: string; request: number } | null
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
  navigation,
  onSectionPosition,
}: HtmlResumePreviewProps) {
  const html = useMemo(() => buildResumeHtml(resumeData, { embedded }), [resumeData, embedded])
  const initialHtmlRef = useRef(html)
  const latestHtmlRef = useRef(html)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const navigationRef = useRef(navigation)
  const positionRef = useRef(onSectionPosition)
  latestHtmlRef.current = html
  navigationRef.current = navigation
  positionRef.current = onSectionPosition

  const updateFrame = useCallback(() => {
    const document = frameRef.current?.contentDocument
    if (document) patchPage(document, latestHtmlRef.current)
  }, [])

  const followSection = useCallback(() => {
    const request = navigationRef.current
    const frame = frameRef.current
    const doc = frame?.contentDocument
    if (!request || !frame || !doc) return

    const destination = request.section === "header"
      ? doc.querySelector(".resume-header")
      : Array.from(doc.querySelectorAll("[data-resume-module-id]")).find(
          (element) => element.getAttribute("data-resume-module-id") === request.section,
        )
    if (!destination) return

    const scroller = doc.scrollingElement ?? doc.documentElement
    const top = destination.getBoundingClientRect().top + scroller.scrollTop
    const visibleHeight = doc.documentElement.clientHeight || frame.clientHeight
    const contentHeight = Math.max(doc.body?.scrollHeight || 0, scroller.scrollHeight)
    const maxScroll = Math.max(0, contentHeight - visibleHeight)

    // Desktop scrolls inside the iframe. Compact previews scroll their scaled
    // outer viewport first, only moving the inner document for long resumes.
    const hasOuterScroller = Boolean(positionRef.current)
    const innerTarget = hasOuterScroller
      ? Math.max(0, top - visibleHeight * 0.8)
      : Math.max(0, top - 28)
    const scrollTop = Math.min(innerTarget, maxScroll)
    scroller.scrollTo({ top: scrollTop, behavior: hasOuterScroller ? "auto" : "smooth" })
    positionRef.current?.(Math.max(0, top - scrollTop))
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(updateFrame)
    return () => cancelAnimationFrame(frame)
  }, [html, updateFrame])

  useEffect(() => {
    const frame = requestAnimationFrame(followSection)
    return () => cancelAnimationFrame(frame)
  }, [navigation?.request, followSection])

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
