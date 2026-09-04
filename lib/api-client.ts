"use client"

export class ClientApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
}
export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const request = () => fetch(url, {
    ...options, cache: "no-store", credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
  })
  let response = await request()
  // Retry only reads: retrying a write after a lost response can create duplicates.
  if ((!options.method || options.method === "GET") && [502, 503, 504].includes(response.status)) {
    await new Promise((resolve) => window.setTimeout(resolve, 500))
    response = await request()
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new ClientApiError(response.status, payload.code || "REQUEST_FAILED", payload.error || "请求失败，请稍后重试。")
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
