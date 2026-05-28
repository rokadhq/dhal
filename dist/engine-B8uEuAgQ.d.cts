import { EventEmitter } from 'node:events';
import { z as DhalSecurityEvent, A as DhalSecuritySignal, p as DhalOptions, f as DhalConfig, s as DhalRequest, j as DhalDecision, t as DhalResponseOutcome } from './types-CX1y5ozy.cjs';

declare class DhalEventBus extends EventEmitter {
    emitDecision(event: DhalSecurityEvent): void;
    emitSignal(signal: DhalSecuritySignal): void;
    onDecision(listener: (event: DhalSecurityEvent) => void): this;
    onThreat(listener: (event: DhalSecurityEvent) => void): this;
    onSignal(listener: (signal: DhalSecuritySignal) => void): this;
}

type DhalEngine = {
    readonly config: DhalConfig;
    readonly events: DhalEventBus;
    inspect(req: DhalRequest): Promise<DhalDecision>;
    recordOutcome(req: DhalRequest, outcome: DhalResponseOutcome): Promise<void>;
};
declare function createDhal(options?: DhalOptions): DhalEngine;

export { type DhalEngine as D, DhalEventBus as a, createDhal as c };
