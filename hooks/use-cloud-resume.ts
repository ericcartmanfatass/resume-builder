"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { AccountUser, CloudResume, CloudResumeSummary } from "@/types/account"
import type { ResumeData } from "@/types/resume"
import { apiRequest } from "@/lib/api-client"
import { exportResumeSourceFile } from "@/lib/resume-utils"

export function useCloudResume(user: AccountUser | null, data: ResumeData, ready: boolean, draftKey: string, onLoad: (data: ResumeData) => void) {
  const userId = user?.id
  const [active, setActive] = useState<CloudResumeSummary | null>(null)
  const [resumes, setResumes] = useState<CloudResumeSummary[]>([])
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(Boolean(userId))
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState("本地草稿")
  const current = useRef(data)
  current.current = data
  const activeRef = useRef<CloudResumeSummary | null>(null)
  const baseline = useRef("")
  const locked = useRef(false)
  const metadataKey = `${draftKey}:cloud`

  const writeLocalDraft = useCallback((snapshot: ResumeData = current.current, link = activeRef.current) => {
    const file = JSON.parse(exportResumeSourceFile(snapshot))
    // Data and its cloud version must be one atomic localStorage write. Separate keys
    // can mix two documents when multiple tabs save simultaneously.
    if (link) file.metadata.cloud = { id: link.id, version: link.version }
    localStorage.setItem(draftKey, JSON.stringify(file))
  }, [draftKey])

  const remember = useCallback((resume: CloudResumeSummary | null) => {
    activeRef.current = resume
    setActive(resume)
    try {
      writeLocalDraft(current.current, resume)
      localStorage.removeItem(metadataKey)
    } catch { /* Cloud save remains valid if browser storage is full. */ }
  }, [metadataKey, writeLocalDraft])

  const refreshList = useCallback(async () => {
    if (!userId) return
    const result = await apiRequest<{ resumes: CloudResumeSummary[] }>("/api/resumes")
    setResumes(result.resumes)
  }, [userId])

  // Reconnect a persisted local draft to its cloud version without overwriting unsaved edits.
  useEffect(() => {
    if (!ready || !userId) return
    let cancelled = false
    locked.current = true
    setBusy(true)
    const restore = async () => {
      try {
        const raw = localStorage.getItem(draftKey)
        const legacy = localStorage.getItem(metadataKey)
        const stored = (raw ? JSON.parse(raw).metadata?.cloud : null) || (legacy ? JSON.parse(legacy) : null)
        if (stored) {
          if (typeof stored.id === "string" && Number.isInteger(stored.version)) {
            const pendingLink = { id: stored.id, version: stored.version, title: current.current.title, updatedAt: current.current.updatedAt, shareToken: null, customShareToken: null }
            activeRef.current = pendingLink
            setActive(pendingLink)
            const { resume } = await apiRequest<{ resume: CloudResume }>(`/api/resumes/${encodeURIComponent(stored.id)}`)
            if (cancelled) return
            baseline.current = JSON.stringify(resume.data)
            if (stored.version !== resume.version && JSON.stringify(current.current) !== baseline.current) {
              remember({ ...resume, version: stored.version })
              setError("云端简历已在其他页面更新。当前本地草稿已保留，请另存副本或重新打开云端版本。")
            } else {
              remember(resume)
              setStatus("已连接云端")
            }
          }
        }
        if (!cancelled) await refreshList()
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "云端连接失败。")
      } finally {
        if (!cancelled) { locked.current = false; setBusy(false); setRestoring(false) }
      }
    }
    void restore()
    return () => { cancelled = true }
  }, [ready, userId, draftKey, metadataKey, remember, refreshList])

  const run = useCallback(async <T,>(work: () => Promise<T>): Promise<T> => {
    if (!userId) throw new Error("请先登录。")
    if (locked.current) throw new Error("正在处理云端操作，请稍候。")
    locked.current = true
    setBusy(true)
    try { return await work() }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : "云端操作失败。")
      throw cause
    } finally { locked.current = false; setBusy(false) }
  }, [userId])

  const persist = useCallback(async (asNew = false) => {
    const existing = asNew ? null : activeRef.current
    const snapshot = current.current
    const serialized = JSON.stringify(snapshot)
    if (existing && serialized === baseline.current) { setError(null); return existing }
    setStatus("正在保存到云端…")
    const { resume } = await apiRequest<{ resume: CloudResume }>(existing ? `/api/resumes/${existing.id}` : "/api/resumes", {
      method: existing ? "PUT" : "POST",
      body: JSON.stringify({ data: snapshot, ...(existing ? { version: existing.version } : {}) }),
    })
    baseline.current = serialized
    remember(resume)
    setError(null)
    setStatus("已保存到云端")
    setResumes((previous) => [resume, ...previous.filter((item) => item.id !== resume.id)])
    return resume
  }, [remember])

  const save = useCallback((asNew = false) => run(() => persist(asNew)), [run, persist])

  useEffect(() => {
    if (!ready || !active || busy || error || JSON.stringify(data) === baseline.current) return
    const timer = window.setTimeout(() => { void save().catch(() => {}) }, 1000)
    return () => window.clearTimeout(timer)
  }, [ready, active, busy, error, data, save])

  const load = useCallback((id: string, discardCurrent = false) => run(async () => {
    if (activeRef.current && !discardCurrent) await persist()
    const { resume } = await apiRequest<{ resume: CloudResume }>(`/api/resumes/${id}`)
    baseline.current = JSON.stringify(resume.data)
    current.current = resume.data
    remember(resume)
    onLoad(resume.data)
    setError(null)
    setStatus("已保存到云端")
  }), [run, persist, remember, onLoad])

  const detach = useCallback(async () => {
    if (!userId) return
    await run(async () => {
      if (activeRef.current) await persist()
      remember(null)
      baseline.current = ""
      setError(null)
      setStatus("本地草稿")
    })
  }, [userId, run, persist, remember])

  const remove = useCallback((id: string) => run(async () => {
    await apiRequest(`/api/resumes/${id}`, { method: "DELETE", body: "{}" })
    if (activeRef.current?.id === id) {
      remember(null)
      baseline.current = ""
      setStatus("云端已删除，当前内容保留为本地草稿")
    }
    setResumes((previous) => previous.filter((item) => item.id !== id))
    setError(null)
  }), [run, remember])

  const publish = useCallback((customToken?: string | null) => run(async () => {
    const resume = await persist()
    const published = await apiRequest<{ token: string; customShareToken: string | null }>(`/api/resumes/${resume.id}/share`, { method: "POST", body: JSON.stringify({ version: resume.version, customToken }) })
    remember({ ...resume, shareToken: published.token, customShareToken: published.customShareToken })
    setResumes((previous) => previous.map((item) => item.id === resume.id ? { ...item, shareToken: published.token, customShareToken: published.customShareToken } : item))
    setError(null)
    return published.token
  }), [run, persist, remember])

  const revoke = useCallback(() => run(async () => {
    const resume = activeRef.current
    if (!resume) return
    await apiRequest(`/api/resumes/${resume.id}/share`, { method: "DELETE", body: "{}" })
    remember({ ...resume, shareToken: null })
    setResumes((previous) => previous.map((item) => item.id === resume.id ? { ...item, shareToken: null } : item))
    setError(null)
  }), [run, remember])

  const visibleStatus = active && !busy && !error && JSON.stringify(data) !== baseline.current ? "修改待同步" : status
  return { active, resumes, busy, restoring, error, status: visibleStatus, save, load, detach, remove, publish, revoke, refreshList, writeLocalDraft }
}

export type CloudResumeControls = ReturnType<typeof useCloudResume>
