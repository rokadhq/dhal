import { E as DhalSignalStore } from '../types-C1dYoaci.cjs';

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
