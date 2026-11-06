"use client"

import { useEffect, useRef } from "react"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { sanitizeHtml } from "@/lib/html-safety"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const toolbarItems = [
  { icon: "mdi:format-bold", command: "bold", value: undefined, label: "加粗" },
  { icon: "mdi:format-italic", command: "italic", value: undefined, label: "斜体" },
  { icon: "mdi:format-list-bulleted", command: "insertUnorderedList", value: undefined, label: "无序列表" },
  { icon: "mdi:format-list-numbered", command: "insertOrderedList", value: undefined, label: "有序列表" },
  { icon: "mdi:format-quote-close", command: "formatBlock", value: "blockquote", label: "引用" },
  { icon: "mdi:code-tags", command: "formatBlock", value: "pre", label: "代码块" },
] as const

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const composingRef = useRef(false)

  useEffect(() => {
    const editor = editorRef.current
    // Never replace the live selection while mobile IME is composing or focused.
    if (!editor || composingRef.current || document.activeElement === editor) return
    const safe = sanitizeHtml(value || "")
    if (editor.innerHTML !== safe) editor.innerHTML = safe
  }, [value])

  // Keep the caret reachable when the virtual keyboard reduces the visual viewport.
  useEffect(() => {
    const editor = editorRef.current
    const viewport = window.visualViewport
    if (!editor || !viewport) return
    let frame = 0

    const ensureCaretVisible = () => {
      if (document.activeElement !== editor || !window.matchMedia("(max-width: 1023px)").matches) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const selection = window.getSelection()
        if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return
        const caret = selection.getRangeAt(0).cloneRange()
        caret.collapse(false)
        const rect = caret.getBoundingClientRect()
        if (!rect.height) return
        const visibleBottom = viewport.offsetTop + viewport.height - 20
        if (rect.bottom > visibleBottom) {
          const panel = editor.closest<HTMLElement>(".editor-panel")
          if (panel) panel.scrollTop += rect.bottom - visibleBottom + 20
        }
      })
    }

    const focus = () => {
      viewport.addEventListener("resize", ensureCaretVisible)
      viewport.addEventListener("scroll", ensureCaretVisible)
      editor.addEventListener("input", ensureCaretVisible)
      ensureCaretVisible()
    }
    const blur = () => {
      viewport.removeEventListener("resize", ensureCaretVisible)
      viewport.removeEventListener("scroll", ensureCaretVisible)
      editor.removeEventListener("input", ensureCaretVisible)
      cancelAnimationFrame(frame)
    }

    editor.addEventListener("focus", focus)
    editor.addEventListener("blur", blur)
    return () => {
      editor.removeEventListener("focus", focus)
      editor.removeEventListener("blur", blur)
      blur()
    }
  }, [])

  const runCommand = (command: string, commandValue?: string) => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    editor.focus()
    document.execCommand(command, false, commandValue)
    onChange(editor.innerHTML)
  }

  return (
    <div className="resume-rich-text-editor min-w-0 max-w-full overflow-hidden rounded-lg border bg-background">
      <div className="flex flex-wrap gap-1 border-b bg-muted/40 p-2">
        {toolbarItems.map((item) => (
          <Button
            key={`${item.command}-${item.label}`}
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand(item.command, item.value)}
          >
            <Icon icon={item.icon} className="h-4 w-4" />
            <span className="sr-only">{item.label}</span>
          </Button>
        ))}
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("removeFormat")}>
          <Icon icon="mdi:format-clear" className="h-4 w-4" />
          <span className="sr-only">清除格式</span>
        </Button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="富文本内容"
        data-placeholder={placeholder}
        className="resume-rich-text-content min-h-[220px] w-full min-w-0 max-w-full break-words px-4 py-3 text-sm leading-6 outline-none [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5 empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
        onCompositionStart={() => { composingRef.current = true }}
        onCompositionEnd={(event) => {
          composingRef.current = false
          onChange(event.currentTarget.innerHTML)
        }}
        onInput={(event) => {
          if (!composingRef.current) onChange(event.currentTarget.innerHTML)
        }}
        onBlur={(event) => {
          const safe = sanitizeHtml(event.currentTarget.innerHTML)
          if (safe !== event.currentTarget.innerHTML) {
            event.currentTarget.innerHTML = safe
            onChange(safe)
          }
        }}
        onPaste={(event) => {
          const html = event.clipboardData.getData("text/html")
          if (!html) return
          event.preventDefault()
          const safe = sanitizeHtml(html)
          const success = document.execCommand("insertHTML", false, safe)
          if (!success) document.execCommand("insertText", false, event.clipboardData.getData("text/plain"))
          if (editorRef.current) onChange(editorRef.current.innerHTML)
        }}
      />
    </div>
  )
}
