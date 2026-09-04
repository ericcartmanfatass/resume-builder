import { randomUUID } from "node:crypto"
import type { PoolClient } from "pg"
import { database, tables, transaction } from "./db"
import { ApiError } from "./http"

export type ExportActor = { userId: string } | { guestId: string; fingerprintHash: string | null; ipHash: string | null }
const activeSql = "(status = 'completed' OR (status = 'pending' AND expires_at > now()))"
const actorKey = (actor: ExportActor) => "userId" in actor ? `user:${actor.userId}` : `guest:${actor.guestId}`
function positiveSetting(name: string, fallback: number) {
  const value = Number(process.env[name] || fallback)
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${name}`)
  return value
}

export async function exportAllowance(actor: ExportActor, client: Pick<PoolClient, "query"> = database()) {
  if ("userId" in actor) return { remainingExports: null, loginRequired: false }
  const result = await client.query<{ guest_count: number; fingerprint_count: number; ip_count: number; ip_guests: number }>(`
    SELECT
      count(*) FILTER (WHERE actor_key = $1 AND ${activeSql})::int AS guest_count,
      count(*) FILTER (WHERE fingerprint_hash = $2 AND ${activeSql})::int AS fingerprint_count,
      count(*) FILTER (WHERE ip_hash = $3 AND created_at > now() - interval '24 hours' AND ${activeSql})::int AS ip_count,
      count(DISTINCT guest_id) FILTER (WHERE ip_hash = $3 AND created_at > now() - interval '24 hours')::int AS ip_guests
    FROM ${tables.exports}
    WHERE guest_id IS NOT NULL AND (actor_key = $1 OR fingerprint_hash = $2 OR (ip_hash = $3 AND created_at > now() - interval '24 hours'))
  `, [actorKey(actor), actor.fingerprintHash, actor.ipHash])
  const counts = result.rows[0]
  const remainingExports = Math.max(0, 2 - Math.max(counts.guest_count, counts.fingerprint_count))
  const loginRequired = !actor.fingerprintHash || remainingExports === 0 ||
    counts.ip_count >= positiveSetting("GUEST_IP_DAILY_LIMIT", 10) ||
    counts.ip_guests >= positiveSetting("GUEST_IP_DAILY_IDENTITIES", 5)
  return { remainingExports, loginRequired }
}

export async function reserveExport(actor: ExportActor) {
  return transaction(async (client) => {
    const key = actorKey(actor)
    const locks = [key]
    if (!("userId" in actor)) {
      if (actor.fingerprintHash) locks.push(`fp:${actor.fingerprintHash}`)
      if (actor.ipHash) locks.push(`ip:${actor.ipHash}`)
    }
    // Shared fingerprint/IP locks prevent simultaneous cookie resets taking extra slots.
    for (const lock of locks.sort()) {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [lock])
    }
    const allowance = await exportAllowance(actor, client)
    if (allowance.loginRequired) throw new ApiError(403, "LOGIN_REQUIRED", "游客导出额度已用完或需要验证身份，请登录后无限次导出。")
    const jobs = await client.query<{ pending: number; recent: number }>(`
      SELECT count(*) FILTER (WHERE status = 'pending' AND expires_at > now())::int AS pending,
        count(*) FILTER (WHERE created_at > now() - interval '1 minute')::int AS recent
      FROM ${tables.exports} WHERE actor_key = $1 AND created_at > now() - interval '5 minutes'
    `, [key])
    if (jobs.rows[0].pending > 0) throw new ApiError(429, "EXPORT_IN_PROGRESS", "正在生成上一份 PDF，请稍后再试。")
    if (jobs.rows[0].recent >= 10) throw new ApiError(429, "TOO_MANY_REQUESTS", "操作过于频繁，请一分钟后重试。")
    const id = randomUUID()
    await client.query(`INSERT INTO ${tables.exports}(id, actor_key, guest_id, fingerprint_hash, ip_hash, status) VALUES ($1, $2, $3, $4, $5, 'pending')`, [
      id, key, "userId" in actor ? null : actor.guestId,
      "userId" in actor ? null : actor.fingerprintHash, "userId" in actor ? null : actor.ipHash,
    ])
    return id
  })
}

export async function completeExport(id: string) {
  const result = await database().query(`UPDATE ${tables.exports} SET status = 'completed' WHERE id = $1 AND status = 'pending' AND expires_at > now() RETURNING id`, [id])
  if (!result.rowCount) throw new ApiError(409, "EXPORT_EXPIRED", "生成超时，请重新导出。此次未扣除额度。")
}

export async function failExport(id: string) {
  await database().query(`UPDATE ${tables.exports} SET status = 'failed' WHERE id = $1 AND status = 'pending'`, [id])
}
