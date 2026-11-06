"use client"

import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react"
import { buildResumeHtml } from "@/lib/export-html"
import type { ResumeData } from "@/types/resume"

export interface PreviewNavigation {
  section: string
  target?: string
  request: number
  alignRatio?: number
}

interface HtmlResumePreviewProps {
  resumeData: ResumeData
  className?: string
  embedded?: boolean
  style?: CSSProperties
  navigation?: PreviewNavigation | null
  editorGuides?: boolean
  onSectionPosition?: (position: number, alignRatio?: number) => void
}

function sectionKey(element: Element): string {
  if (element.matches(".resume-header")) return "header"
  const id = element.getAttribute("data-resume-module-id")
  return id === null ? "empty" : "module:" + id
}

// Keep the A4 iframe mounted while editing: patch changed nodes rather than
// recreating the frame, so the scroll position and unchanged avatar persist.
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

function findSection(document: Document, section: string): HTMLElement | null {
  if (section === "header") return document.querySelector<HTMLElement>(".resume-header")
  return Array.from(document.querySelectorAll<HTMLElement>("[data-resume-module-id]")).find(
    (element) => element.getAttribute("data-resume-module-id") === section,
  ) ?? null
}

function findTarget(document: Document, navigation: PreviewNavigation): HTMLElement | null {
  if (navigation.target) {
    const field = Array.from(document.querySelectorAll<HTMLElement>("[data-preview-field]")).find(
      (element) => element.getAttribute("data-preview-field") === navigation.target,
    )
    if (field) return field
  }
  return findSection(document, navigation.section)
}

export default function HtmlResumePreview({
  resumeData,
  className,
  embedded = false,
  style,
  navigation,
  editorGuides = false,
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

  // These margins live outside the A4 paper inside the editor preview only.
  // PDF export renders buildResumeHtml directly and never receives these styles.
  const ensureGuides = useCallback(() => {
    if (!editorGuides) return
    const frame = frameRef.current
    const doc = frame?.contentDocument
    const page = doc?.querySelector<HTMLElement>("main.page")
    if (!frame || !doc || !page) return

    if (!doc.getElementById("resume-preview-guides")) {
      const sheet = doc.createElement("style")
      sheet.id = "resume-preview-guides"
      sheet.textContent = [
        "body { display: flow-root !important; }",
        ".resume-preview-active {",
        "  outline: 2px solid rgba(220, 38, 38, 0.76) !important;",
        "  outline-offset: 3px;",
        "  background-color: rgba(239, 68, 68, 0.10) !important;",
        "  border-radius: 3px;",
        "  transition: outline-color 140ms ease, background-color 140ms ease;",
        "}",
        "@media print {",
        "  .page { margin-top: 0 !important; margin-bottom: 0 !important; }",
        "  .resume-preview-active { outline: none !important; background: transparent !important; }",
        "}",
      ].join("\n")
      doc.head.appendChild(sheet)
    }

    const extraSpace = Math.max(280, Math.ceil(frame.clientHeight * 0.95))
    const previousSpace = Number(page.dataset.previewOuterSpace || "0")
    if (extraSpace === previousSpace) return
    page.style.marginTop = extraSpace + "px"
    page.style.marginBottom = extraSpace + "px"
    page.dataset.previewOuterSpace = String(extraSpace)
    // Preserve the paper's visible position when its outer margin changes.
    const scroller = doc.scrollingElement ?? doc.documentElement
    scroller.scrollTop += extraSpace - previousSpace
  }, [editorGuides])

  const highlightField = useCallback(() => {
    if (!editorGuides) return
    const doc = frameRef.current?.contentDocument
    if (!doc) return
    doc.querySelectorAll(".resume-preview-active").forEach((element) => {
      element.classList.remove("resume-preview-active")
    })
    const request = navigationRef.current
    if (!request) return
    findTarget(doc, request)?.classList.add("resume-preview-active")
  }, [editorGuides])

  const updateFrame = useCallback(() => {
    const doc = frameRef.current?.contentDocument
    if (!doc) return
    patchPage(doc, latestHtmlRef.current)
    ensureGuides()
    highlightField()
  }, [ensureGuides, highlightField])

  const followSection = useCallback(() => {
    const request = navigationRef.current
    const frame = frameRef.current
    const doc = frame?.contentDocument
    if (!request || !frame || !doc) return
    const destination = findTarget(doc, request)
    if (!destination) return

    const scroller = doc.scrollingElement ?? doc.documentElement
    const visibleHeight = doc.documentElement.clientHeight || frame.clientHeight
    const top = destination.getBoundingClientRect().top + scroller.scrollTop
    const maxScroll = Math.max(0, scroller.scrollHeight - visibleHeight)
    const alignRatio = Math.min(0.9, Math.max(0.08, request.alignRatio ?? 0.22))
    const scrollTop = Math.min(Math.max(0, top - visibleHeight * alignRatio), maxScroll)

    // Navigate on field/section selection, never on every keystroke.
    scroller.scrollTo({ top: scrollTop, behavior: "smooth" })
    positionRef.current?.(Math.max(0, top - scrollTop), alignRatio)
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(updateFrame)
    return () => cancelAnimationFrame(id)
  }, [html, updateFrame])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      updateFrame()
      followSection()
    })
    return () => cancelAnimationFrame(id)
  }, [navigation?.request, followSection, updateFrame])

  useEffect(() => {
    if (!editorGuides) return
    const frame = frameRef.current
    if (!frame) return
    let id = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(id)
      id = requestAnimationFrame(ensureGuides)
    })
    observer.observe(frame)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(id)
    }
  }, [editorGuides, ensureGuides])

  return (
    <iframe
      ref={frameRef}
      title="Resume HTML Preview"
      // Scripts remain disabled in the frame; parent updates sanitized HTML.
      sandbox="allow-same-origin"
      srcDoc={initialHtmlRef.current}
      onLoad={() => {
        updateFrame()
        ensureGuides()
        highlightField()
        followSection()
      }}
      style={style}
      className={className ?? "block h-full w-full border-0 bg-white"}
    />
  )
}
