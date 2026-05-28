import { IncomingMessage, ServerResponse } from 'node:http';
import { D as DhalEngine } from '../engine-B8uEuAgQ.cjs';
import { p as DhalOptions, j as DhalDecision } from '../types-CX1y5ozy.cjs';
import 'node:events';

declare function createNodeHttpDhal(options?: DhalOptions): {
    engine: DhalEngine;
    inspect(req: IncomingMessage, res: ServerResponse): Promise<DhalDecision>;
};

export { createNodeHttpDhal };
