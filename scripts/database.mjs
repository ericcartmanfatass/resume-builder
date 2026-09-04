import fs from 'node:fs/promises'
import { Pool } from 'pg'

try { process.loadEnvFile('.env.local') } catch (error) { if (error.code !== 'ENOENT') throw error }
const initializing = process.argv.includes('--init')
if (!initializing && !process.argv.includes('--check')) throw new Error('Use --check or --init')
if (initializing) {
  try { process.loadEnvFile('.env.database-admin.local') } catch (error) { if (error.code !== 'ENOENT') throw error }
}
const adminRole = initializing ? process.env.DATABASE_ADMIN_ROLE : undefined
if (adminRole && !/^[a-z_][a-z0-9_]{0,62}$/.test(adminRole)) throw new Error('Invalid database owner role')
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const connectionString = initializing ? process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL : process.env.DATABASE_URL
const appUrl = new URL(process.env.DATABASE_URL)
const operationUrl = new URL(connectionString)
if (appUrl.host !== operationUrl.host || appUrl.pathname !== operationUrl.pathname) throw new Error('Application and maintenance connections must target the same database')
const appRole = decodeURIComponent(appUrl.username)
if (!/^[a-z_][a-z0-9_]{0,62}$/.test(appRole)) throw new Error('Invalid application role')
const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: true } : false,
  connectionTimeoutMillis: 10000,
  statement_timeout: 20000,
})
let client
try {
  client = await pool.connect()
  if (process.argv.includes('--check')) {
    const result = await client.query('SELECT current_database() AS database, current_user AS username, version() AS version')
    console.log(result.rows[0])
    const existing = await client.query('SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name', ['public'])
    console.log({ applicationSchema: 'public', tables: existing.rows })
  } else if (initializing) {
    await client.query('BEGIN')
    if (adminRole) await client.query(`SET LOCAL ROLE "${adminRole}"`)
    const legacy = await client.query("SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='resume_builder' AND c.relname IN ('resumes','shares','export_jobs') AND c.relkind='r' LIMIT 1")
    if (legacy.rowCount) throw new Error('Move the existing business tables to public before initialization; refusing to create duplicate tables')
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', ['resume-builder:initialize-public'])
    await client.query(await fs.readFile('db/schema.sql', 'utf8'))
    await client.query(`GRANT USAGE ON SCHEMA public TO "${appRole}"`)
    await client.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON public.resumes,public.shares,public.export_jobs TO "${appRole}"`)
    await client.query('COMMIT')
    console.log('Public business tables and comments initialized; existing data preserved.')
  }
} catch (error) {
  if (client) await client.query('ROLLBACK').catch(() => {})
  console.error('Database operation failed:', error.code || error.name)
  process.exitCode = 1
} finally {
  client?.release()
  await pool.end()
}
