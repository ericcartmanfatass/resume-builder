import { randomBytes, randomUUID } from "node:crypto"
import type { ResumeData } from "@/types/resume"
import type { CloudResume } from "@/types/account"
import { database, tables, transaction } from "./db"
import { ApiError } from "./http"

const selection = `r.id, r.data, r.version, r.updated_at AS "updatedAt", s.token AS "shareToken"`

export async function listResumes(ownerId: string) {
  const result = await database().query(`SELECT r.id, r.data->>'title' AS title, r.version, r.updated_at AS "updatedAt", s.token AS "shareToken" FROM ${tables.resumes} r LEFT JOIN ${tables.shares} s ON s.resume_id = r.id WHERE r.owner_id = $1 ORDER BY r.updated_at DESC LIMIT 200`, [ownerId])
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
  return { ...result.rows[0], title: result.rows[0].data.title, shareToken: null } as CloudResume
}

export async function updateResume(ownerId: string, id: string, data: ResumeData, version: number) {
  const result = await database().query(`UPDATE ${tables.resumes} r SET data = $1, version = version + 1, updated_at = now() WHERE id = $2 AND owner_id = $3 AND version = $4 RETURNING r.id, r.data, r.version, r.updated_at AS "updatedAt", (SELECT token FROM ${tables.shares} WHERE resume_id = r.id) AS "shareToken"`, [JSON.stringify(data), id, ownerId, version])
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

export async function publishResume(ownerId: string, id: string, version: number) {
  return transaction(async (client) => {
    const result = await client.query(`SELECT data, version FROM ${tables.resumes} WHERE id = $1 AND owner_id = $2 FOR UPDATE`, [id, ownerId])
    if (!result.rowCount) throw new ApiError(404, "NOT_FOUND", "简历不存在或已删除。")
    if (result.rows[0].version !== version) throw new ApiError(409, "VERSION_CONFLICT", "云端版本已更新，请重新保存后再分享。")
    const share = await client.query(`INSERT INTO ${tables.shares}(token, resume_id, snapshot) VALUES ($1, $2, $3) ON CONFLICT (resume_id) DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = now() RETURNING token`, [randomBytes(24).toString("base64url"), id, JSON.stringify(result.rows[0].data)])
    return share.rows[0].token as string
  })
}

export async function revokeShare(ownerId: string, id: string) {
  await readResume(ownerId, id)
  await database().query(`DELETE FROM ${tables.shares} s USING ${tables.resumes} r WHERE s.resume_id = r.id AND r.id = $1 AND r.owner_id = $2`, [id, ownerId])
}

export async function readShare(token: string): Promise<ResumeData | null> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null
  const result = await database().query(`SELECT snapshot FROM ${tables.shares} WHERE token = $1`, [token])
  return result.rows[0]?.snapshot || null
}
