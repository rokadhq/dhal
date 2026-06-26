import { IncomingMessage, ServerResponse } from 'node:http';
import { D as DhalEngine } from '../engine-BeMQe4lr.js';
import { q as DhalOptions, k as DhalDecision } from '../types-C1dYoaci.js';
import 'node:events';

declare function createNodeHttpDhal(options?: DhalOptions): {
    engine: DhalEngine;
    inspect(req: IncomingMessage, res: ServerResponse): Promise<DhalDecision>;
};

export { createNodeHttpDhal };
