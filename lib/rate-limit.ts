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
  } catch {
    // Fail open to memory on Redis hiccups rather than locking everyone out.
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

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const redis = await getRedis()
  if (redis) return checkRedis(redis, `rl:${key}`, limit, windowMs)
  return checkMemory(key, limit, windowMs)
}

export function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
