import { randomBytes, randomUUID } from "node:crypto"
import type { ResumeData } from "@/types/resume"
import type { CloudResume } from "@/types/account"
import { database, tables, transaction } from "./db"
import { ApiError } from "./http"

const activeShareToken = `CASE WHEN s.snapshot <> 'null'::jsonb THEN s.token ELSE NULL END`
const customShareToken = `CASE WHEN length(s.token) < 32 THEN s.token ELSE NULL END`
const selection = `r.id, r.data, r.version, r.updated_at AS "updatedAt", ${activeShareToken} AS "shareToken", ${customShareToken} AS "customShareToken"`

export async function listResumes(ownerId: string) {
  const result = await database().query(`SELECT r.id, r.data->>'title' AS title, r.version, r.updated_at AS "updatedAt", ${activeShareToken} AS "shareToken", ${customShareToken} AS "customShareToken" FROM ${tables.resumes} r LEFT JOIN ${tables.shares} s ON s.resume_id = r.id WHERE r.owner_id = $1 ORDER BY r.updated_at DESC LIMIT 200`, [ownerId])
  return result.rows
}

export async function readResume(ownerId: string, id: string): Promise<CloudResume> {
  const result = await database().query(`SELECT ${selection} FROM ${tables.resumes} r LEFT JOIN ${tables.shares} s ON s.resume_id = r.id WHERE r.id = $1 AND r.owner_id = $2`, [id, ownerId])
  if (!result.rowCount) throw new ApiError(404, "NOT_FOUND", "简历不存在或已删除。")
  return { ...result.rows[0], title: result.rows[0].data.title }
}

export async function createResume(ownerId: string, data: ResumeData) {
  const id = randomUUID()
  const result = await database().query(`INSERT INTO ${tables.resumes}(id, owner_id, data) VALUES ($1, $2, $3) RETURNING id, data, version, updated_at AS "updatedAt"`, [id, ownerId, JSON.stringify(data)])
  return { ...result.rows[0], title: result.rows[0].data.title, shareToken: null, customShareToken: null } as CloudResume
}

export async function updateResume(ownerId: string, id: string, data: ResumeData, version: number) {
  const result = await database().query(`UPDATE ${tables.resumes} r SET data = $1, version = version + 1, updated_at = now() WHERE id = $2 AND owner_id = $3 AND version = $4 RETURNING r.id, r.data, r.version, r.updated_at AS "updatedAt", (SELECT CASE WHEN snapshot <> 'null'::jsonb THEN token ELSE NULL END FROM ${tables.shares} WHERE resume_id = r.id) AS "shareToken", (SELECT CASE WHEN length(token) < 32 THEN token ELSE NULL END FROM ${tables.shares} WHERE resume_id = r.id) AS "customShareToken"`, [JSON.stringify(data), id, ownerId, version])
  if (!result.rowCount) {
    await readResume(ownerId, id)
    throw new ApiError(409, "VERSION_CONFLICT", "简历已在其他页面更新。请另存副本，或重新打开云端版本。")
  }
  return { ...result.rows[0], title: result.rows[0].data.title } as CloudResume
}

export async function deleteResume(ownerId: string, id: string) {
  const result = await database().query(`DELETE FROM ${tables.resumes} WHERE id = $1 AND owner_id = $2 RETURNING id`, [id, ownerId])
  if (!result.rowCount) throw new ApiError(404, "NOT_FOUND", "简历不存在或已删除。")
}

export async function publishResume(ownerId: string, id: string, version: number, requestedCustomToken?: string | null) {
  return transaction(async (client) => {
    const result = await client.query(`SELECT data, version FROM ${tables.resumes} WHERE id = $1 AND owner_id = $2 FOR UPDATE`, [id, ownerId])
    if (!result.rowCount) throw new ApiError(404, "NOT_FOUND", "简历不存在或已删除。")
    if (result.rows[0].version !== version) throw new ApiError(409, "VERSION_CONFLICT", "云端版本已更新，请重新保存后再分享。")
    const existing = await client.query(`SELECT token FROM ${tables.shares} WHERE resume_id = $1`, [id])
    const existingToken = existing.rows[0]?.token as string | undefined
    const existingIsCustom = Boolean(existingToken && existingToken.length < 32)
    const token = typeof requestedCustomToken === "string"
      ? requestedCustomToken
      : requestedCustomToken === null && existingIsCustom
        ? randomBytes(24).toString("base64url")
        : existingToken || randomBytes(24).toString("base64url")
    try {
      const share = await client.query(`INSERT INTO ${tables.shares}(token, resume_id, snapshot) VALUES ($1, $2, $3) ON CONFLICT (resume_id) DO UPDATE SET token = EXCLUDED.token, snapshot = EXCLUDED.snapshot, updated_at = now() RETURNING token`, [token, id, JSON.stringify(result.rows[0].data)])
      return { token: share.rows[0].token as string, customShareToken: share.rows[0].token.length < 32 ? share.rows[0].token as string : null }
    } catch (cause) {
      if ((cause as { code?: string })?.code === "23505") throw new ApiError(409, "CUSTOM_LINK_TAKEN", "这个自定义链接已被使用，请换一个。")
      throw cause
    }
  })
}

export async function revokeShare(ownerId: string, id: string) {
  await readResume(ownerId, id)
  await transaction(async (client) => {
    const share = await client.query(`SELECT s.token FROM ${tables.shares} s JOIN ${tables.resumes} r ON r.id = s.resume_id WHERE r.id = $1 AND r.owner_id = $2 FOR UPDATE`, [id, ownerId])
    const token = share.rows[0]?.token as string | undefined
    if (!token) return
    if (token.length < 32) {
      await client.query(`UPDATE ${tables.shares} SET snapshot = 'null'::jsonb, updated_at = now() WHERE resume_id = $1`, [id])
    } else {
      await client.query(`DELETE FROM ${tables.shares} WHERE resume_id = $1`, [id])
    }
  })
}

export async function readShare(token: string): Promise<ResumeData | null> {
  if (!/^(?:[A-Za-z0-9_-]{32}|[a-z0-9][a-z0-9-]{1,28}[a-z0-9])$/.test(token)) return null
  const result = await database().query(`SELECT snapshot FROM ${tables.shares} WHERE token = $1`, [token])
  return result.rows[0]?.snapshot || null
}
