import { IncomingMessage, ServerResponse } from 'node:http';
import { D as DhalEngine } from '../engine-DZ0jvLHu.js';
import { p as DhalOptions, j as DhalDecision } from '../types-CX1y5ozy.js';
import 'node:events';

declare function createNodeHttpDhal(options?: DhalOptions): {
    engine: DhalEngine;
    inspect(req: IncomingMessage, res: ServerResponse): Promise<DhalDecision>;
};

export { createNodeHttpDhal };
