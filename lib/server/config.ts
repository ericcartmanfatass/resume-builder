import type { LogtoNextConfig } from "@logto/next"

export function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing server configuration: ${name}`)
  return value
}

export function appBaseUrl() {
  const url = new URL(requiredEnv("LOGTO_BASE_URL"))
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Invalid LOGTO_BASE_URL")
  }
  return url.origin
}

export function authConfigured() {
  return ["LOGTO_ENDPOINT", "LOGTO_APP_ID", "LOGTO_APP_SECRET", "LOGTO_COOKIE_SECRET", "LOGTO_BASE_URL"]
    .every((name) => Boolean(process.env[name]?.trim()))
}

export function logtoConfig(): LogtoNextConfig {
  const cookieSecret = requiredEnv("LOGTO_COOKIE_SECRET")
  if (cookieSecret.length < 32) throw new Error("LOGTO_COOKIE_SECRET must be at least 32 characters")
  return {
    endpoint: requiredEnv("LOGTO_ENDPOINT"),
    appId: requiredEnv("LOGTO_APP_ID"),
    appSecret: requiredEnv("LOGTO_APP_SECRET"),
    baseUrl: appBaseUrl(),
    cookieSecret,
    cookieSecure: new URL(appBaseUrl()).protocol === "https:",
  }
}
