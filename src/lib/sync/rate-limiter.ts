/**
 * sync/rate-limiter.ts
 * Per-service rate limiter with request queuing, 429 detection, and exponential backoff.
 *
 * Each external API service gets its own:
 *   - Concurrency queue (max N parallel requests)
 *   - 429 / Retry-After handling
 *   - Exponential backoff for transient errors (5xx, network failures)
 *   - Structured logging for all retry attempts
 *
 * Usage:
 *   const res = await rateLimitedFetch("gmail", url, options);
 */

/** Thrown when all retry attempts are exhausted after a 429 response. */
export class RateLimitError extends Error {
    constructor(
        public readonly retryAfterMs: number,
        public readonly service: string,
    ) {
        super(`[rate-limiter/${service}] Rate limit exhausted. Next allowed in ${retryAfterMs}ms.`);
        this.name = "RateLimitError";
    }
}

interface ServiceConfig {
    /** Max number of simultaneous in-flight requests. */
    maxConcurrent: number;
    /** Max number of retries per request (across both 429 and transient errors). */
    maxRetries: number;
    /** Base delay for exponential backoff (doubles each attempt). */
    baseBackoffMs: number;
}

const SERVICE_CONFIGS: Record<string, ServiceConfig> = {
    gmail: { maxConcurrent: 5, maxRetries: 4, baseBackoffMs: 500 },
    slack: { maxConcurrent: 3, maxRetries: 4, baseBackoffMs: 1000 },
    microsoft: { maxConcurrent: 3, maxRetries: 4, baseBackoffMs: 500 },
    teams: { maxConcurrent: 3, maxRetries: 4, baseBackoffMs: 500 },
    outlook: { maxConcurrent: 3, maxRetries: 4, baseBackoffMs: 500 },
    ai: { maxConcurrent: 2, maxRetries: 3, baseBackoffMs: 2000 },
};

const DEFAULT_CONFIG: ServiceConfig = { maxConcurrent: 3, maxRetries: 3, baseBackoffMs: 1000 };

// ── Concurrency queue ─────────────────────────────────────────────────────────

class RequestQueue {
    private running = 0;
    private readonly waiting: Array<() => void> = [];

    constructor(private readonly maxConcurrent: number) {}

    async run<T>(fn: () => Promise<T>): Promise<T> {
        await this.acquire();
        try {
            return await fn();
        } finally {
            this.release();
        }
    }

    private acquire(): Promise<void> {
        if (this.running < this.maxConcurrent) {
            this.running++;
            return Promise.resolve();
        }
        return new Promise<void>(resolve => {
            this.waiting.push(resolve);
        });
    }

    private release(): void {
        const next = this.waiting.shift();
        if (next) {
            next();
        } else {
            this.running--;
        }
    }
}

const queues = new Map<string, RequestQueue>();

function getQueue(service: string): RequestQueue {
    let queue = queues.get(service);
    if (!queue) {
        const config = SERVICE_CONFIGS[service] ?? DEFAULT_CONFIG;
        queue = new RequestQueue(config.maxConcurrent);
        queues.set(service, queue);
    }
    return queue;
}

// ── Retry-After header parsing ────────────────────────────────────────────────

function parseRetryAfterMs(headers: Headers, fallbackMs: number): number {
    const header = headers.get("Retry-After") ?? headers.get("X-RateLimit-Reset-After");
    if (!header) return fallbackMs;

    // Integer seconds
    const seconds = parseFloat(header);
    if (!isNaN(seconds) && isFinite(seconds)) return Math.ceil(seconds) * 1000;

    // HTTP date
    const date = new Date(header).getTime();
    if (!isNaN(date)) return Math.max(0, date - Date.now());

    return fallbackMs;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for `fetch` with rate limiting, queuing, and retry.
 *
 * @param service  One of: "gmail" | "slack" | "microsoft" | "ai" (or any string for defaults)
 * @param url      Request URL
 * @param options  Standard RequestInit options
 */
export async function rateLimitedFetch(
    service: string,
    url: string,
    options?: RequestInit,
): Promise<Response> {
    const config = SERVICE_CONFIGS[service] ?? DEFAULT_CONFIG;
    const queue = getQueue(service);
    let lastError: unknown;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            const res = await queue.run(() => fetch(url, options));

            // ── Rate limited (429) ────────────────────────────────────────────
            if (res.status === 429) {
                const waitMs = parseRetryAfterMs(res.headers, config.baseBackoffMs * Math.pow(2, attempt));

                if (attempt < config.maxRetries) {
                    console.warn(
                        `[rate-limiter/${service}] 429 rate limited (attempt ${attempt + 1}/${config.maxRetries + 1}). ` +
                        `Retrying in ${waitMs}ms.`,
                    );
                    await sleep(waitMs);
                    continue;
                }

                throw new RateLimitError(waitMs, service);
            }

            // ── Server error — retry with backoff ─────────────────────────────
            if (res.status >= 500 && attempt < config.maxRetries) {
                const backoff = config.baseBackoffMs * Math.pow(2, attempt);
                console.warn(
                    `[rate-limiter/${service}] ${res.status} server error (attempt ${attempt + 1}/${config.maxRetries + 1}). ` +
                    `Retrying in ${backoff}ms.`,
                );
                await sleep(backoff);
                continue;
            }

            return res;
        } catch (err: unknown) {
            // Don't retry our own RateLimitError
            if (err instanceof RateLimitError) throw err;

            lastError = err;

            if (attempt < config.maxRetries) {
                const backoff = config.baseBackoffMs * Math.pow(2, attempt);
                console.warn(
                    `[rate-limiter/${service}] Network error (attempt ${attempt + 1}/${config.maxRetries + 1}). ` +
                    `Retrying in ${backoff}ms:`,
                    err instanceof Error ? err.message : String(err),
                );
                await sleep(backoff);
            }
        }
    }

    throw lastError ?? new Error(`[rate-limiter/${service}] All ${config.maxRetries + 1} attempts failed.`);
}
