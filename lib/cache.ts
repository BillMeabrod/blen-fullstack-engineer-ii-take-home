/**
 * In-memory TTL cache.
 *
 * Intentionally simple — demonstrates the caching pattern without
 * infrastructure dependencies. In production, replace the Map with
 * a Redis client. The interface callers use stays the same.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>()

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    })
  }

  invalidate(key: string): void {
    this.store.delete(key)
  }

  size(): number {
    return this.store.size
  }
}

export function cacheKey(...parts: unknown[]): string {
  return parts
    .map((p) => (typeof p === "string" ? p : JSON.stringify(p)))
    .join("|")
}