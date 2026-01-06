import { db } from './init.js'
import { promisify } from 'util'

const dbRun = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<any>
const dbGet = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>
const dbAll = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>

/**
 * Migrate database schema to add subscription columns
 * This is safe to run multiple times - it checks if columns exist first
 */
export const migrateDatabase = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        // Check if stripe_customer_id column exists
        const tableInfo = await dbAll("PRAGMA table_info(users)")
        const columnNames = tableInfo.map((col: any) => col.name)

        const columnsToAdd = [
          { name: 'stripe_customer_id', type: 'TEXT' },
          { name: 'stripe_subscription_id', type: 'TEXT' },
          { name: 'subscription_status', type: 'TEXT DEFAULT "free"' },
          { name: 'subscription_tier', type: 'TEXT DEFAULT "free"' },
          { name: 'subscription_started_at', type: 'DATETIME' },
          { name: 'subscription_ends_at', type: 'DATETIME' },
        ]

        for (const column of columnsToAdd) {
          if (!columnNames.includes(column.name)) {
            console.log(`Adding column: ${column.name}`)
            await dbRun(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`)
          }
        }

        // Check if stripe_events table exists
        const tablesResult = await dbGet(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='stripe_events'"
        )
        
        if (!tablesResult) {
          console.log('Creating stripe_events table')
          await dbRun(`
            CREATE TABLE IF NOT EXISTS stripe_events (
              id TEXT PRIMARY KEY,
              event_type TEXT NOT NULL,
              stripe_event_id TEXT UNIQUE NOT NULL,
              user_id TEXT,
              subscription_id TEXT,
              data TEXT,
              processed INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
          `)
          await dbRun(`CREATE INDEX IF NOT EXISTS idx_stripe_events_user_id ON stripe_events(user_id)`)
          await dbRun(`CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_event_id ON stripe_events(stripe_event_id)`)
        }

        console.log('✅ Database migration completed')
        resolve()
      } catch (error) {
        console.error('❌ Database migration failed:', error)
        reject(error)
      }
    })
  })
}

