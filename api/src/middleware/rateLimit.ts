import type { Request, Response, NextFunction, RequestHandler } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  /** Optional custom key. Default: ip */
  key?: (req: Request) => string;
  /** Optional response message */
  message?: string;
};

type Bucket = { count: number; resetAt: number };

/**
 * Minimalny rate limiter bez dodatkowych zależności.
 * Uwaga: pamięć procesu – wystarczy na obronę / dev.
 */
export function rateLimit(opts: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, Bucket>();

  const windowMs = Math.max(1_000, opts.windowMs);
  const max = Math.max(1, opts.max);
  const getKey = opts.key ?? ((req) => req.ip || "unknown");
  const message = opts.message ?? "Zbyt wiele prób. Spróbuj ponownie za chwilę.";

  return (req: Request, res: Response, next: NextFunction) => {
    const key = getKey(req);
    const now = Date.now();

    const prev = buckets.get(key);
    if (!prev || prev.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    prev.count += 1;
    buckets.set(key, prev);

    // headers (best effort)
    const remaining = Math.max(0, max - prev.count);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(prev.resetAt / 1000)));

    if (prev.count > max) {
      return res.status(429).json({
        code: "RATE_LIMIT",
        message,
      });
    }

    return next();
  };
}
