// @ts-nocheck
const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL, fileURLToPath } = require('node:url')
const Module = require('node:module')

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://localhost:5432/bodysync_test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key'
delete process.env.SUPABASE_URL
delete process.env.SUPABASE_KEY

const stubSources = {
  'stub:dotenv': 'export default {};',
  'stub:pg': `
    export class Pool {
      async query() { return { rows: [] }; }
      async connect() { return { query: async () => ({ rows: [] }), release() {} }; }
    }
    export default { Pool };
  `,
  'stub:bcryptjs': `
    const bcrypt = {
      hash: async (s) => 'hashed:' + s,
      compare: async (s, h) => h === 'hashed:' + s,
    };
    export default bcrypt;
  `,
  'stub:jsonwebtoken': `
    const jwt = {
      sign: () => 'signed.jwt.token',
      verify: () => ({ userId: 'u1', email: 'a@b.com', role: 'comum' }),
    };
    export default jwt;
  `,
  'stub:supabase': `
    export const createClient = () => ({ storage: { from: () => ({}) } });
  `,
}

const bareMap = {
  'dotenv/config': 'stub:dotenv',
  pg: 'stub:pg',
  bcryptjs: 'stub:bcryptjs',
  jsonwebtoken: 'stub:jsonwebtoken',
  '@supabase/supabase-js': 'stub:supabase',
}

if (typeof Module.registerHooks === 'function') {
  Module.registerHooks({
    resolve(specifier, context, nextResolve) {
      if (bareMap[specifier]) {
        return { url: bareMap[specifier], shortCircuit: true }
      }
      if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
        const parentDir = path.dirname(fileURLToPath(context.parentURL))
        const resolved = path.resolve(parentDir, specifier)
        if (!fs.existsSync(resolved) && fs.existsSync(`${resolved}.ts`)) {
          return {
            url: pathToFileURL(`${resolved}.ts`).href,
            shortCircuit: true,
          }
        }
      }
      return nextResolve(specifier, context)
    },
    load(url, context, nextLoad) {
      if (stubSources[url]) {
        return {
          format: 'module',
          source: stubSources[url],
          shortCircuit: true,
        }
      }
      if (url.endsWith('.ts') && !url.endsWith('.test.ts')) {
        const res = nextLoad(url, { ...context, format: 'module-typescript' })
        return res
      }
      return nextLoad(url, context)
    },
  })
}

test('Item 8: env carrega sem SUPABASE_URL e SUPABASE_KEY e falha apenas se storage for acionado', async () => {
  const { env } = await import('../config/env.ts')
  const { supabase } = await import('../config/supabase.ts')

  assert.equal(env.SUPABASE_URL, '')
  assert.equal(env.SUPABASE_KEY, '')
  assert.throws(
    () => supabase.storage,
    /SUPABASE_URL e SUPABASE_KEY são obrigatórios/
  )
})

test('Item 6: hashResetToken gera hash SHA-256 determinístico e nunca retorna o token puro', async () => {
  const { hashResetToken } = await import('../modules/auth/auth.service.ts')
  const rawToken = 'a1b2c3d4e5f6'
  const hashed = hashResetToken(rawToken)
  const expected = crypto.createHash('sha256').update(rawToken).digest('hex')

  assert.notEqual(hashed, rawToken)
  assert.equal(hashed.length, 64)
  assert.equal(hashed, expected)
})

test('Item 7: dateKey respeita o fuso America/Sao_Paulo mesmo após 21h BRT (00h+ UTC)', async () => {
  const { dateKey } = await import('../modules/session/session.service.ts')

  // 2026-11-02 às 22:30 em São Paulo = 2026-11-03T01:30:00.000Z em UTC
  const lateNightBrazil = new Date('2026-11-03T01:30:00.000Z')
  assert.equal(dateKey(lateNightBrazil), '2026-11-02')

  // 2026-11-03 às 00:15 em São Paulo = 2026-11-03T03:15:00.000Z em UTC
  const afterMidnightBrazil = new Date('2026-11-03T03:15:00.000Z')
  assert.equal(dateKey(afterMidnightBrazil), '2026-11-03')
})

test('Item 7: buildHydrationStatus calcula copos e percentual corretamente', async () => {
  const { buildHydrationStatus } = await import(
    '../modules/hydration/hydration.service.ts'
  )

  const status = buildHydrationStatus('2026-11-02', 1250, 2500, null)
  assert.equal(status.goalMl, 2500)
  assert.equal(status.cups.consumed, 5)
  assert.equal(status.cups.total, 10)
  assert.equal(status.percentage, 50)
})

test('Item 9: PROFILE_FIELD_MAP bloqueia chaves arbitrárias (SQL injection guard)', async () => {
  const { PROFILE_FIELD_MAP } = await import(
    '../modules/user-profile/user-profile.service.ts'
  )

  assert.equal(PROFILE_FIELD_MAP['weightKg'], 'weight_kg')
  assert.equal(PROFILE_FIELD_MAP['id; DROP TABLE users; --'], undefined)
})

test('planGenerator: distribui exercícios equilibrados por objetivo', async () => {
  const { planGenerator } = await import('../modules/workout/plan-generator.ts')

  const scheme = planGenerator.schemeFor('ganho_massa_muscular')
  assert.equal(scheme.sets, 4)
  assert.equal(scheme.reps, 10)

  const picked = planGenerator.pickBalanced(
    [
      { id: 1, category: 'Chest' },
      { id: 2, category: 'Back' },
      { id: 3, category: 'Legs' },
    ],
    ['Chest', 'Back', 'Legs'],
    2
  )
  assert.equal(picked.length, 2)
})
