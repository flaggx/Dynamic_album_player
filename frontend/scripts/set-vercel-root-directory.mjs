#!/usr/bin/env node
/**
 * Set Vercel project Root Directory (monorepo fix: use `frontend` where package.json + Next live).
 *
 * Requires a token: https://vercel.com/account/tokens
 *
 *   cd frontend && VERCEL_TOKEN=... npm run vercel:set-root
 *
 * Optional: VERCEL_ROOT_DIRECTORY=my-app (default: frontend)
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const frontendRoot = join(__dirname, '..')
const vercelDir = join(frontendRoot, '.vercel', 'project.json')

const token = process.env.VERCEL_TOKEN
if (!token) {
  console.error(
    'Missing VERCEL_TOKEN. Create one at https://vercel.com/account/tokens then:\n' +
      '  cd frontend && VERCEL_TOKEN=your_token npm run vercel:set-root'
  )
  process.exit(1)
}

if (!existsSync(vercelDir)) {
  console.error('Missing .vercel/project.json — run: npx vercel link')
  process.exit(1)
}

const { projectId, orgId } = JSON.parse(readFileSync(vercelDir, 'utf-8'))
if (!projectId || !orgId) {
  console.error('.vercel/project.json must contain projectId and orgId')
  process.exit(1)
}

const rootDirectory = (process.env.VERCEL_ROOT_DIRECTORY || 'frontend').replace(/^\/+/, '')

const url = new URL(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}`)
url.searchParams.set('teamId', orgId)

const res = await fetch(url, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ rootDirectory }),
})

const body = await res.text()
if (!res.ok) {
  console.error(`API error ${res.status}:`, body)
  process.exit(1)
}

console.log(`Updated Root Directory to "${rootDirectory}" for project ${projectId}.`)
console.log('Verify:  npx vercel project inspect')
try {
  const json = JSON.parse(body)
  if (json.rootDirectory != null) console.log('Response rootDirectory:', json.rootDirectory)
} catch {
  // ignore non-JSON
}
