"use server"

import { signIn, signOut } from "@logto/next/server-actions"
import { logtoConfig } from "@/lib/server/config"

export async function startSignIn() {
  const config = logtoConfig()
  await signIn(config, { redirectUri: `${config.baseUrl}/callback` })
}

export async function endSession() {
  const config = logtoConfig()
  await signOut(config, `${config.baseUrl}/`)
}
