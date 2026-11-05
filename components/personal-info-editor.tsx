"use client"

import { useEffect, useRef, useState } from "react"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { PersonalInfoItem, ResumeData } from "@/types/resume"
import { sanitizeSvgBody, sanitizeUrl } from "@/lib/html-safety"
import { createNewPersonalInfoItem } from "@/lib/resume-utils"
import IconPicker from "./icon-picker"

type AvatarShape = NonNullable<ResumeData["avatarShape"]>

interface PersonalInfoEditorProps {
  personalInfo: PersonalInfoItem[]
  avatar?: string
  avatarShape?: AvatarShape
  onUpdate: (personalInfo: PersonalInfoItem[], avatar?: string, avatarShape?: AvatarShape) => void
}

const CROP_SIZE = 280

export default function PersonalInfoEditor({ personalInfo, avatar, avatarShape = "circle", onUpdate }: PersonalInfoEditorProps) {
  const [avatarUrl, setAvatarUrl] = useState(avatar || "")
  const [shape, setShape] = useState<AvatarShape>(avatarShape)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropSize, setCropSize] = useState(CROP_SIZE)
  const [cropSource, setCropSource] = useState("")
  const [imageReady, setImageReady] = useState(false)
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 })
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const safeAvatarUrl = sanitizeUrl(avatarUrl, { allowImages: true })

  useEffect(() => {
    const query = window.matchMedia("(max-width: 379px)");
    const update = () => setCropSize(query.matches ? 220 : CROP_SIZE);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => setAvatarUrl(avatar || ""), [avatar])
  useEffect(() => setShape(avatarShape), [avatarShape])

  const clampOffset = (next: { x: number; y: number }, nextZoom = zoom) => {
    const baseScale = cropSize / Math.min(imageSize.width, imageSize.height)
    const maxX = Math.max(0, (imageSize.width * baseScale * nextZoom - cropSize) / 2)
    const maxY = Math.max(0, (imageSize.height * baseScale * nextZoom - cropSize) / 2)
    return { x: Math.max(-maxX, Math.min(maxX, next.x)), y: Math.max(-maxY, Math.min(maxY, next.y)) }
  }

  const openCropper = (source: string) => {
    setCropSource(source)
    setImageReady(false)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setShape(avatarShape)
    setCropOpen(true)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file?.type.startsWith("image/") || file.size > 8 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = (loadEvent) => openCropper(loadEvent.target?.result as string)
    reader.readAsDataURL(file)
  }

  const applyCrop = () => {
    const image = imageRef.current
    if (!image || !image.naturalWidth || !image.naturalHeight) return
    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext("2d")
    if (!context) return
    const renderedScale = (cropSize / Math.min(image.naturalWidth, image.naturalHeight)) * zoom
    const left = (cropSize - image.naturalWidth * renderedScale) / 2 + offset.x
    const top = (cropSize - image.naturalHeight * renderedScale) / 2 + offset.y
    const sourceSize = cropSize / renderedScale
    context.drawImage(image, -left / renderedScale, -top / renderedScale, sourceSize, sourceSize, 0, 0, 512, 512)
    const cropped = canvas.toDataURL("image/jpeg", 0.9)
    setAvatarUrl(cropped)
    onUpdate(personalInfo, cropped, shape)
    setCropOpen(false)
  }

  const updateShape = (next: AvatarShape) => {
    setShape(next)
  }

  const updatePersonalInfoItem = (id: string, updates: Partial<PersonalInfoItem>) => {
    onUpdate(personalInfo.map((item) => item.id === id ? { ...item, ...updates } : item), avatarUrl, shape)
  }

  return (
    <Card className="section-card">
      <div className="section-header">
        <div className="flex items-center gap-2"><Icon icon="mdi:account-circle" className="h-5 w-5 text-primary" /><h2 className="section-title">个人信息</h2></div>
        <Button size="sm" variant="outline" onClick={() => onUpdate([...personalInfo, createNewPersonalInfoItem()], avatarUrl, shape)} className="gap-2 bg-transparent"><Icon icon="mdi:plus" className="h-4 w-4" />添加信息</Button>
      </div>

      <div className="space-y-4">
        <div className="form-group">
          <Label className="form-label">头像</Label>
          <div className="flex items-center gap-4 rounded-xl bg-muted/40 p-3">
            <button type="button" className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden bg-muted transition-opacity hover:opacity-85 ${avatarShape === "circle" ? "rounded-full" : "rounded-md"}`} onClick={() => safeAvatarUrl ? openCropper(safeAvatarUrl) : fileInputRef.current?.click()} aria-label={safeAvatarUrl ? "编辑头像" : "上传头像"}>
              {safeAvatarUrl ? <img src={safeAvatarUrl} alt="头像预览" className="h-full w-full object-cover" /> : <Icon icon="mdi:account" className="h-9 w-9 text-muted-foreground" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">简历头像</p>
              <p className="mt-1 text-xs text-muted-foreground">在裁剪窗口中调整位置、缩放和形状</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => safeAvatarUrl ? openCropper(safeAvatarUrl) : fileInputRef.current?.click()}><Icon icon={safeAvatarUrl ? "mdi:crop" : "mdi:image-plus"} className="mr-2 h-4 w-4" />{safeAvatarUrl ? "编辑头像" : "上传头像"}</Button>
                {safeAvatarUrl && <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { setAvatarUrl(""); onUpdate(personalInfo, "", avatarShape) }}>移除</Button>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {personalInfo.map((item) => <PersonalInfoItemEditor key={item.id} item={item} onUpdate={(updates) => updatePersonalInfoItem(item.id, updates)} onRemove={() => onUpdate(personalInfo.filter((entry) => entry.id !== item.id), avatarUrl, shape)} />)}
        </div>
        {personalInfo.length === 0 && <div className="py-8 text-center text-muted-foreground"><Icon icon="mdi:information-outline" className="mx-auto mb-2 h-8 w-8 opacity-50" /><p className="text-sm">暂无个人信息，点击“添加信息”开始编辑</p></div>}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>拖动裁剪头像</DialogTitle><DialogDescription>拖动图片调整位置，使用滑块缩放；虚线框内是最终头像范围。</DialogDescription></DialogHeader>
          <div className="mx-auto max-w-full overflow-hidden bg-muted touch-none" style={{ width: cropSize, height: cropSize }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragStart.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y } }} onPointerMove={(event) => { if (!dragStart.current) return; setOffset(clampOffset({ x: dragStart.current.offsetX + event.clientX - dragStart.current.x, y: dragStart.current.offsetY + event.clientY - dragStart.current.y })) }} onPointerUp={() => { dragStart.current = null }} onPointerCancel={() => { dragStart.current = null }}>
            <div className="relative h-full w-full cursor-grab active:cursor-grabbing">
              {cropSource && <img ref={imageRef} src={cropSource} alt="待裁剪头像" draggable={false} onLoad={(event) => { setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }); setImageReady(true) }} className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none" style={{ width: imageSize.width * (cropSize / Math.min(imageSize.width, imageSize.height)), height: imageSize.height * (cropSize / Math.min(imageSize.width, imageSize.height)), transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }} />}
              <div className={`pointer-events-none absolute inset-0 border-2 border-dashed border-white/90 shadow-[0_0_0_999px_rgba(15,23,42,0.38)] ${shape === "circle" ? "rounded-full" : "rounded-md"}`} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-2">
            <span className="pl-1 text-sm font-medium">头像形状</span>
            <div className="flex gap-1" role="group" aria-label="头像形状">
              <Button type="button" size="sm" variant={shape === "square" ? "default" : "ghost"} onClick={() => updateShape("square")} className="h-8"><Icon icon="mdi:square-outline" className="mr-1.5 h-4 w-4" />方形</Button>
              <Button type="button" size="sm" variant={shape === "circle" ? "default" : "ghost"} onClick={() => updateShape("circle")} className="h-8"><Icon icon="mdi:circle-outline" className="mr-1.5 h-4 w-4" />圆形</Button>
            </div>
          </div>
          <div className="flex items-center gap-3"><Icon icon="mdi:image-size-select-small" className="h-4 w-4 text-muted-foreground" /><input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(event) => { const next = Number(event.target.value); setZoom(next); setOffset((current) => clampOffset(current, next)) }} aria-label="头像缩放" className="h-2 w-full cursor-pointer accent-primary" /><Icon icon="mdi:image-size-select-large" className="h-5 w-5 text-muted-foreground" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setCropOpen(false)}>取消</Button><Button onClick={applyCrop} disabled={!imageReady}>应用裁剪</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

interface PersonalInfoItemEditorProps { item: PersonalInfoItem; onUpdate: (updates: Partial<PersonalInfoItem>) => void; onRemove: () => void }

function PersonalInfoItemEditor({ item, onUpdate, onRemove }: PersonalInfoItemEditorProps) {
  const iconBody = sanitizeSvgBody(item.icon)
  return <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
    <Dialog><DialogTrigger asChild><Button variant="outline" size="sm" className="icon-button bg-transparent">{iconBody && <svg width={24} height={24} viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: iconBody }} />}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>选择图标</DialogTitle></DialogHeader><IconPicker selectedIcon={item.icon} onSelect={(icon) => onUpdate({ icon })} /></DialogContent></Dialog>
    <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2"><div><Label className="text-xs text-muted-foreground">标签</Label><Input value={item.label} onChange={(event) => onUpdate({ label: event.target.value })} placeholder="如：电话、邮箱" className="h-8" /></div><div><Label className="text-xs text-muted-foreground">内容</Label><Input value={item.value} onChange={(event) => onUpdate({ value: event.target.value })} placeholder="请输入对应内容" className="h-8" /></div></div>
    <Button variant="ghost" size="sm" onClick={onRemove} className="icon-button text-destructive hover:text-destructive" aria-label="删除信息"><Icon icon="mdi:delete" className="h-4 w-4" /></Button>
  </div>
}
