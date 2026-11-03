import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next"
import { ZodError } from "zod"
import { appBaseUrl } from "./config"

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
}

export function apiHandler(handler: NextApiHandler): NextApiHandler {
  return async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store")
    res.setHeader("X-Content-Type-Options", "nosniff")
    try {
      await handler(req, res)
    } catch (error) {
      if (res.headersSent) return
      if (error instanceof ApiError) {
        return res.status(error.status).json({ code: error.code, error: error.message })
      }
      if (error instanceof ZodError) {
        return res.status(400).json({ code: "INVALID_DATA", error: "简历数据格式不正确或内容超出限制。" })
      }
      // Do not expose database connection strings, tokens, SQL, or provider errors.
      const diagnostic = error instanceof Error ? error.message : "UnknownError"
      const secrets = [process.env.DATABASE_URL, process.env.LOGTO_APP_SECRET, process.env.LOGTO_COOKIE_SECRET, process.env.GUEST_COOKIE_SECRET].filter(Boolean) as string[]
      console.error("Resume API failed", secrets.reduce((message, secret) => message.replaceAll(secret, "[redacted]"), diagnostic).replace(/postgres(?:ql)?:\/\/\S+/gi, "[database]"))
      return res.status(503).json({ code: "SERVICE_UNAVAILABLE", error: "服务暂时不可用，请稍后重试。" })
    }
  }
}

export function allowMethods(req: NextApiRequest, res: NextApiResponse, methods: string[]) {
  if (!methods.includes(req.method || "")) {
    res.setHeader("Allow", methods.join(", "))
    throw new ApiError(405, "METHOD_NOT_ALLOWED", "不支持的请求方式。")
  }
}

export function requireSameOrigin(req: NextApiRequest) {
  // Next dev can choose another port, or be opened through 127.0.0.1.
  // Only accept loopback origins matching the actual request host in development.
  let localDevelopmentOrigin = false
  if (process.env.NODE_ENV === "development" && req.headers.origin) {
    try {
      const origin = new URL(req.headers.origin)
      localDevelopmentOrigin = ["http:", "https:"].includes(origin.protocol)
        && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
        && origin.host === req.headers.host
        && origin.origin === req.headers.origin
    } catch { /* Invalid origins are rejected below. */ }
  }
  if (!localDevelopmentOrigin && req.headers.origin !== appBaseUrl()) {
    throw new ApiError(403, "INVALID_ORIGIN", "请从本站发起操作。")
  }
  if (!req.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
    throw new ApiError(415, "INVALID_CONTENT_TYPE", "请求需要使用 JSON 格式。")
  }
}
