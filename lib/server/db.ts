import { Pool, type PoolClient } from "pg"
import { requiredEnv } from "./config"

export const tables = {
  resumes: '"public".resumes',
  shares: '"public".shares',
  exports: '"public".export_jobs',
}

const dbGlobal = globalThis as typeof globalThis & { resumeDatabasePool?: Pool }
export function database() {
  if (!dbGlobal.resumeDatabasePool) {
    dbGlobal.resumeDatabasePool = new Pool({
      connectionString: requiredEnv("DATABASE_URL"),
      ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : false,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      query_timeout: 20000,
      statement_timeout: 15000,
      application_name: "resume-builder",
    })
    dbGlobal.resumeDatabasePool.on("error", () => console.error("Database pool connection failed"))
  }
  return dbGlobal.resumeDatabasePool
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await database().connect()
  try {
    await client.query("BEGIN")
    const result = await work(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    throw error
  } finally {
    client.release()
  }
}
