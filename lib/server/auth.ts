import LogtoClient from "@logto/next"
import type { NextApiRequest, NextApiResponse } from "next"
import type { AccountUser } from "@/types/account"
import { authConfigured, logtoConfig } from "./config"
import { ApiError } from "./http"

export async function getApiUser(req: NextApiRequest, res: NextApiResponse): Promise<AccountUser | null> {
  if (!authConfigured()) return null
  // The SDK keeps mutable request storage. Never share a client across requests.
  const client = new LogtoClient(logtoConfig())
  const nodeClient = await client.createNodeClientFromNextApi(req, res)
  const { isAuthenticated, claims } = await nodeClient.getContext()
  if (!isAuthenticated || !claims?.sub) return null
  return { id: claims.sub, name: claims.name || claims.username || "正式用户" }
}

export async function requireApiUser(req: NextApiRequest, res: NextApiResponse) {
  const user = await getApiUser(req, res)
  if (!user) throw new ApiError(401, "LOGIN_REQUIRED", "请先登录后使用此功能。")
  return user
}
