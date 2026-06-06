type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

// In-memory fixed-window rate limiter. Suitable for a single-instance
// (self-hosted) deployment; for multi-instance, swap the store for Redis.
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
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

export function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
