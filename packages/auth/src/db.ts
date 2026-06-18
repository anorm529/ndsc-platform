import { Pool } from 'pg'

let pool: Pool | null = null

export function getAuthDb(): Pool {
  if (!pool) {
    const connectionString = process.env.AUTH_DATABASE_URL
    if (!connectionString) {
      throw new Error('AUTH_DATABASE_URL environment variable is not set')
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
    })
  }
  return pool
}
