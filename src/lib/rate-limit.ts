import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisClient = Redis.fromEnv();

export const apiRateLimiter = new Ratelimit({
  redis: redisClient,
  limiter: Ratelimit.slidingWindow(5, "10 s"),
  analytics: true,
  prefix: "@upstash/ratelimit/api",
});

export const sessionCreateRateLimiter = new Ratelimit({
  redis: redisClient,
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  analytics: true,
  prefix: "@upstash/ratelimit/session-create",
});
