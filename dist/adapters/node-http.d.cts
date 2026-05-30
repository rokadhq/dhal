import { IncomingMessage, ServerResponse } from 'node:http';
import { D as DhalEngine } from '../engine-CEH7vEA-.cjs';
import { p as DhalOptions, j as DhalDecision } from '../types-6Dn0mDWH.cjs';
import 'node:events';

declare function createNodeHttpDhal(options?: DhalOptions): {
    engine: DhalEngine;
    inspect(req: IncomingMessage, res: ServerResponse): Promise<DhalDecision>;
};

export { createNodeHttpDhal };
