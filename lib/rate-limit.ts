type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

type UpstashRedis = {
  eval: (script: string, keys: string[], args: (string | number)[]) => Promise<unknown>
}

let redisPromise: Promise<UpstashRedis | null> | null = null

async function getRedis(): Promise<UpstashRedis | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  if (!redisPromise) {
    redisPromise = import('@upstash/redis')
      .then(({ Redis }) => new Redis({ url, token }) as unknown as UpstashRedis)
      .catch(() => null)
  }
  return redisPromise
}

// Atomic fixed-window limiter in Redis. Lua keeps INCR + EXPIRE together so two
// concurrent requests can't both squeeze past the boundary.
const luaIncr = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return current
`

async function checkRedis(
  redis: UpstashRedis,
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  try {
    const count = (await redis.eval(luaIncr, [key], [windowMs])) as number
    return count <= limit
  } catch (err) {
    // Fail open to memory on Redis hiccups rather than locking everyone out.
    // Log loudly so the degradation (weaker, per-instance limiting) is visible.
    console.warn('[rate-limit] Redis error, falling back to in-memory limiter', err)
    return checkMemory(key, limit, windowMs)
  }
}

function checkMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()

  if (store.size > 10_000) {
    for (const [k, v] of store) {
      if (now > v.resetAt) store.delete(k)
    }
  }

  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}

let warnedNoRedis = false

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const redis = await getRedis()
  if (redis) return checkRedis(redis, `rl:${key}`, limit, windowMs)

  // Tanpa Redis, limiter hanya per-instance (lemah di serverless multi-instance).
  // Peringatkan sekali di produksi agar konfigurasi yang hilang terlihat.
  if (!warnedNoRedis && process.env.NODE_ENV === 'production') {
    warnedNoRedis = true
    console.warn('[rate-limit] UPSTASH_REDIS_* not configured; using in-memory limiter (per-instance only)')
  }
  return checkMemory(key, limit, windowMs)
}

// Ambil IP klien untuk rate-limit.
//
// Diutamakan `x-real-ip`: di platform seperti Vercel header ini di-set oleh edge
// yang tepercaya dan bernilai tunggal, jadi tidak bisa dipalsukan klien.
// `x-forwarded-for` dipakai sebagai fallback (entri paling kiri = klien asli saat
// di belakang proxy tepercaya). Jika app pernah diekspos tanpa proxy tepercaya,
// kedua header ini bisa dipalsukan — pastikan selalu berada di belakang Vercel.
export function clientIp(headers: Headers): string {
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()

  return 'unknown'
}
