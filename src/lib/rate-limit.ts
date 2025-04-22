import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisClient = Redis.fromEnv();

// General API Limiter: Allows 5 requests per 10 seconds from a single identifier (e.g., IP or session ID)
export const apiRateLimiter = new Ratelimit({
  redis: redisClient,
  limiter: Ratelimit.slidingWindow(5, "10 s"), // 5 requests / 10 seconds
  analytics: true, // Enable analytics tracking (optional)
  prefix: "@upstash/ratelimit/api", // Namespace keys in Redis
});

// Session Creation Limiter: Stricter limit (e.g., 3 requests per minute from a single IP)
export const sessionCreateRateLimiter = new Ratelimit({
  redis: redisClient,
  limiter: Ratelimit.slidingWindow(3, "1 m"), // 3 requests / 1 minute
  analytics: true,
  prefix: "@upstash/ratelimit/session-create",
});
