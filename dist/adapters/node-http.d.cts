import { IncomingMessage, ServerResponse } from 'node:http';
import { D as DhalEngine } from '../engine-CusOB5og.cjs';
import { q as DhalOptions, k as DhalDecision } from '../types-C1dYoaci.cjs';
import 'node:events';
import '../lifecycle-CLClIjxX.cjs';

declare function createNodeHttpDhal(options?: DhalOptions): {
    engine: DhalEngine;
    inspect(req: IncomingMessage, res: ServerResponse): Promise<DhalDecision>;
};

export { createNodeHttpDhal };
