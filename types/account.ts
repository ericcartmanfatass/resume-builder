import type { ResumeData } from "@/types/resume"

export type AccountUser = { id: string; name: string }
export type AccountSession = {
  user: AccountUser | null
  loginEnabled: boolean
  remainingExports: number | null
  loginRequired: boolean
}
export type CloudResumeSummary = {
  id: string
  title: string
  version: number
  updatedAt: string
  shareToken: string | null
  customShareToken: string | null
}
export type CloudResume = CloudResumeSummary & { data: ResumeData }
