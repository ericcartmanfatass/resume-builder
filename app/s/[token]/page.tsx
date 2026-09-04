import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { readShare } from "@/lib/server/resumes"
import { SavedResumePreview } from "@/components/saved-resume-preview"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "简历分享", robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" }

export default async function SharedResumePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await readShare(token)
  if (!data) notFound()
  return <SavedResumePreview data={data} shareToken={token} />
}
