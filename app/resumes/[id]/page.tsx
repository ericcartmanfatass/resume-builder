import type { Metadata } from "next"
import { getLogtoContext } from "@logto/next/server-actions"
import { notFound, redirect } from "next/navigation"
import { logtoConfig, authConfigured } from "@/lib/server/config"
import { readResume } from "@/lib/server/resumes"
import { ApiError } from "@/lib/server/http"
import { resumeIdSchema } from "@/lib/server/resume-schema"
import { SavedResumePreview } from "@/components/saved-resume-preview"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "个人简历预览", robots: { index: false, follow: false }, referrer: "no-referrer" }

export default async function PrivateResumePage({ params }: { params: Promise<{ id: string }> }) {
  if (!authConfigured()) redirect("/sign-in")
  const { isAuthenticated, claims } = await getLogtoContext(logtoConfig())
  if (!isAuthenticated || !claims?.sub) redirect("/sign-in")
  const { id } = await params
  if (!resumeIdSchema.safeParse(id).success) notFound()
  let resume
  try { resume = await readResume(claims.sub, id) }
  catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error }
  return <SavedResumePreview data={resume.data} />
}
