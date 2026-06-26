import { R as RateLimitStore, s as DhalRateLimitConfig } from '../types-C1dYoaci.cjs';

type RedisLikeClient = {
    incr(key: string): Promise<number> | number;
    pexpire?(key: string, milliseconds: number): Promise<unknown> | unknown;
    expire?(key: string, seconds: number): Promise<unknown> | unknown;
};
declare class RedisRateLimitStore implements RateLimitStore {
    private readonly client;
    private readonly options;
    constructor(client: RedisLikeClient, options?: {
        prefix?: string;
    });
    consume(key: string, limit: DhalRateLimitConfig): Promise<{
        allowed: boolean;
        remaining: number;
        resetAt: number;
    }>;
}

export { type RedisLikeClient, RedisRateLimitStore };
