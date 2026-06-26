import { E as DhalSignalStore } from '../types-C1dYoaci.cjs';

type RedisSignalLikeClient = {
    incr(key: string): Promise<number> | number;
    ttl?(key: string): Promise<number> | number;
    pttl?(key: string): Promise<number> | number;
    pexpire?(key: string, milliseconds: number): Promise<unknown> | unknown;
    expire?(key: string, seconds: number): Promise<unknown> | unknown;
    get?(key: string): Promise<string | number | null> | string | number | null;
};
declare class RedisSignalStore implements DhalSignalStore {
    private readonly client;
    private readonly options;
    constructor(client: RedisSignalLikeClient, options?: {
        prefix?: string;
    });
    record(key: string, windowSeconds: number): Promise<{
        count: number;
        resetAt: number;
    }>;
    count(key: string): Promise<{
        count: number;
        resetAt: number;
    }>;
    private key;
    private resetAt;
}

export { type RedisSignalLikeClient, RedisSignalStore };
