import { dbRun } from './client.js'

/**
 * Idempotent schema tweaks for existing databases.
 * Safe to run on every startup.
 */
export async function migrateDatabase(): Promise<void> {
  await dbRun(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE`
  )
  console.log('✅ Database migration completed')
}
