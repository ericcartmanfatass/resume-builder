import { handleSignIn } from "@logto/next/server-actions"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"
import { logtoConfig } from "@/lib/server/config"

export async function GET(request: NextRequest) {
  let failed = false
  try {
    // We do not configure postRedirectUri, so this helper only exchanges the code.
    await handleSignIn(logtoConfig(), request.nextUrl.searchParams)
  } catch {
    failed = true
  }
  redirect(failed ? "/sign-in?error=callback" : "/")
}
