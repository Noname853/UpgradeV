import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkRateLimit, clientIp } from './rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests up to the limit', () => {
    const key = `test-allow-${Math.random()}`
    expect(checkRateLimit(key, 3, 1000)).toBe(true)
    expect(checkRateLimit(key, 3, 1000)).toBe(true)
    expect(checkRateLimit(key, 3, 1000)).toBe(true)
  })

  it('blocks the request that exceeds the limit', () => {
    const key = `test-block-${Math.random()}`
    checkRateLimit(key, 2, 1000)
    checkRateLimit(key, 2, 1000)
    expect(checkRateLimit(key, 2, 1000)).toBe(false)
  })

  it('resets the counter after the window expires', () => {
    const key = `test-reset-${Math.random()}`
    checkRateLimit(key, 1, 1000)
    expect(checkRateLimit(key, 1, 1000)).toBe(false)

    vi.advanceTimersByTime(1001)
    expect(checkRateLimit(key, 1, 1000)).toBe(true)
  })

  it('tracks different keys independently', () => {
    const a = `test-a-${Math.random()}`
    const b = `test-b-${Math.random()}`
    expect(checkRateLimit(a, 1, 1000)).toBe(true)
    expect(checkRateLimit(a, 1, 1000)).toBe(false)
    expect(checkRateLimit(b, 1, 1000)).toBe(true)
  })
})

describe('clientIp', () => {
  it('uses the first address from x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.1, 70.41.3.18' })
    expect(clientIp(headers)).toBe('203.0.113.1')
  })

  it('falls back to x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.7' })
    expect(clientIp(headers)).toBe('198.51.100.7')
  })

  it('returns "unknown" when no ip headers are present', () => {
    expect(clientIp(new Headers())).toBe('unknown')
  })
})
