"use client"

let fingerprintPromise: Promise<string | null> | undefined
export function browserFingerprint() {
  fingerprintPromise ??= (async () => {
    try {
      // A best-effort risk signal, not a hardware ID. Nothing is sent to a third party.
      const canvas = document.createElement("canvas")
      canvas.width = 240
      canvas.height = 40
      const context = canvas.getContext("2d")
      if (context) {
        context.font = "16px Arial"
        context.fillText("Resume Builder · 简历 418", 4, 24)
      }
      const signals = JSON.stringify({
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages,
        platform: navigator.platform,
        cores: navigator.hardwareConcurrency,
        screen: [screen.width, screen.height, screen.colorDepth],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        canvas: context ? canvas.toDataURL() : "unavailable",
      })
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(signals))
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
    } catch { return null }
  })()
  return fingerprintPromise
}
