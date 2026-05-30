import { C as DhalSignalStore } from '../types-6Dn0mDWH.cjs';

declare class MemorySignalStore implements DhalSignalStore {
    private readonly buckets;
    record(key: string, windowSeconds: number): Promise<{
        count: number;
        resetAt: number;
    }>;
    count(key: string): Promise<{
        count: number;
        resetAt: number;
    }>;
}

export { MemorySignalStore };
