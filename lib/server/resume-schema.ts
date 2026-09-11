import { z } from "zod"
import { sanitizeHtml, sanitizeSvgBody, sanitizeUrl } from "@/lib/html-safety"

// Cloud drafts may be incomplete. Export validation is applied separately.
export const resumeSchema = z.object({
  title: z.string().max(200),
  personalInfo: z.array(z.object({
    id: z.string().min(1).max(200),
    label: z.string().max(100),
    value: z.string().max(2000),
    icon: z.string().max(20000).optional().transform(sanitizeSvgBody),
  })).max(50),
  avatar: z.string().max(4 * 1024 * 1024).optional().transform((v) => sanitizeUrl(v || "", { allowImages: true })),
  avatarShape: z.enum(["square", "circle"]).optional(),
  modules: z.array(z.object({
    id: z.string().min(1).max(200),
    title: z.string().max(200),
    subtitle: z.string().max(500).optional(),
    timeRange: z.string().max(200).optional(),
    content: z.string().max(200000),
    contentMode: z.enum(["markdown", "rich-text"]).optional(),
    icon: z.string().max(20000).optional().transform(sanitizeSvgBody),
    order: z.number().int().min(0).max(1000),
  }).transform((module) => ({
    ...module,
    content: module.contentMode === "rich-text" ? sanitizeHtml(module.content) : module.content,
  }))).max(100),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export const resumeIdSchema = z.uuid()
export const saveResumeSchema = z.object({ data: resumeSchema, version: z.number().int().positive() })
