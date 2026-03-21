import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

export function getRedis() {
  if (!_redis) {
    _redis = Redis.fromEnv();
  }
  return _redis;
}
