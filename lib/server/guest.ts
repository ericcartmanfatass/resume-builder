import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"
import { isIP } from "node:net"
import type { NextApiRequest, NextApiResponse } from "next"
import { requiredEnv, appBaseUrl } from "./config"
import { ApiError } from "./http"

export const GUEST_COOKIE = "resume_guest_id"

export function riskHash(value: string) {
  const secret = requiredEnv("GUEST_COOKIE_SECRET")
  if (secret.length < 32) throw new Error("GUEST_COOKIE_SECRET must be at least 32 characters")
  return createHmac("sha256", secret).update(value).digest("hex")
}

export function signGuestId(id: string) { return `${id}.${riskHash(`cookie:${id}`)}` }
export function verifyGuestId(cookie?: string): string | null {
  if (!cookie) return null
  const [id, signature, extra] = cookie.split(".")
  if (extra || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id || "") || !/^[a-f0-9]{64}$/.test(signature || "")) return null
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(riskHash(`cookie:${id}`), "hex")) ? id : null
}

export function guestId(req: NextApiRequest, res: NextApiResponse, initialize = false) {
  const existing = verifyGuestId(req.cookies[GUEST_COOKIE])
  if (existing) return existing
  if (!initialize) throw new ApiError(409, "GUEST_SESSION_REQUIRED", "请刷新页面后重试导出。")
  const id = randomUUID()
  const secure = appBaseUrl().startsWith("https://") ? "; Secure" : ""
  const cookie = `${GUEST_COOKIE}=${signGuestId(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`
  const previous = res.getHeader("Set-Cookie")
  res.setHeader("Set-Cookie", [...(Array.isArray(previous) ? previous.map(String) : previous ? [String(previous)] : []), cookie])
  return id
}

export function requestFingerprint(req: NextApiRequest) {
  const value = req.headers["x-guest-fingerprint"]
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value) ? riskHash(`fingerprint:${value}`) : null
}

export function requestIpHash(req: NextApiRequest) {
  // Never trust arbitrary client-supplied X-Forwarded-For by default.
  const trustedHeader = process.env.VERCEL === "1" ? "x-vercel-forwarded-for" : process.env.TRUSTED_IP_HEADER?.toLowerCase()
  const forwarded = trustedHeader ? req.headers[trustedHeader] : undefined
  let ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress
  if (ip?.startsWith("::ffff:")) ip = ip.slice(7)
  return ip && isIP(ip) ? riskHash(`ip:${ip}`) : null
}
