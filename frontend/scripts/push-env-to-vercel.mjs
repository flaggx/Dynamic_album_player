#!/usr/bin/env node
/**
 * Push selected env vars from .env.local to Vercel (production + preview).
 * Values are sent on stdin to `vercel env add` so they do not appear in argv.
 *
 * Prerequisites: `npx vercel link` from frontend/ (creates .vercel/project.json).
 *
 * Usage:
 *   cd frontend && node scripts/push-env-to-vercel.mjs
 *   ENV_FILE=.env.production.local node scripts/push-env-to-vercel.mjs
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const envFile = join(root, process.env.ENV_FILE || '.env.local')
const targets = (process.env.VERCEL_ENV_TARGETS || 'production,preview')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function parseEnvFile(content) {
  /** @type {Record<string, string>} */
  const out = {}
  for (const rawLine of content.split(/\r?\n/)) {
    let line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    let key = line.slice(0, eq).trim()
    if (key.startsWith('export ')) key = key.slice(7).trim()
    let val = line.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

/**
 * @param {string} name
 * @param {string} vercelTarget
 * @param {string} value
 * @param {{ sensitive?: boolean }} opts
 */
function vercelEnvAdd(name, vercelTarget, value, opts = {}) {
  const args = ['vercel', 'env', 'add', name, vercelTarget, '--yes', '--force']
  if (opts.sensitive) args.push('--sensitive')
  else args.push('--no-sensitive')

  const r = spawnSync('npx', args, {
    cwd: root,
    input: value,
    encoding: 'utf-8',
    stdio: ['pipe', 'inherit', 'inherit'],
    env: { ...process.env },
  })
  if (r.error) throw r.error
  if (r.status !== 0) {
    throw new Error(`vercel env add failed for ${name} (${vercelTarget}), exit ${r.status}`)
  }
}

function requireLink() {
  const linkPath = join(root, '.vercel', 'project.json')
  if (!existsSync(linkPath)) {
    console.error('Missing .vercel/project.json — run from frontend/:  npx vercel link')
    process.exit(1)
  }
}

function main() {
  requireLink()
  if (!existsSync(envFile)) {
    console.error(`Missing ${envFile}`)
    process.exit(1)
  }
  const env = parseEnvFile(readFileSync(envFile, 'utf-8'))

  /** @type {{ name: string, sensitive: boolean, optional?: boolean }[]} */
  const defs = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', sensitive: false },
    { name: 'SUPABASE_URL', sensitive: false, optional: true },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', sensitive: true },
    { name: 'STRIPE_SECRET_KEY', sensitive: true, optional: true },
    { name: 'STRIPE_WEBHOOK_SECRET', sensitive: true, optional: true },
    { name: 'STRIPE_PRICE_ID', sensitive: true, optional: true },
    { name: 'FRONTEND_URL', sensitive: false, optional: true },
    { name: 'NEXT_PUBLIC_LEGACY_UPLOADS_BASE_URL', sensitive: false, optional: true },
  ]

  const pub = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!env.NEXT_PUBLIC_SUPABASE_URL || (!pub && !anon)) {
    console.error(
      'Need NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
    process.exit(1)
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Need SUPABASE_SERVICE_ROLE_KEY for /api/premium/*')
    process.exit(1)
  }

  const clientKeyDef = pub
    ? { name: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', value: pub, sensitive: false }
    : { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: anon, sensitive: false }

  for (const t of targets) {
    console.log(`\n--- ${t} ---`)
    console.log(`  + ${clientKeyDef.name}`)
    vercelEnvAdd(clientKeyDef.name, t, clientKeyDef.value, { sensitive: clientKeyDef.sensitive })
    for (const def of defs) {
      const value = env[def.name]
      if (def.optional && (value === undefined || value === '')) continue
      if (!def.optional && (value === undefined || value === '')) {
        console.error(`Missing required: ${def.name}`)
        process.exit(1)
      }
      if (value === undefined || value === '') continue
      console.log(`  + ${def.name}`)
      vercelEnvAdd(def.name, t, value, { sensitive: def.sensitive })
    }
  }
  console.log('\nDone. Verify:  npx vercel env ls')
}

main()
