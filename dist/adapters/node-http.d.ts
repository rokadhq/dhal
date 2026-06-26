import { IncomingMessage, ServerResponse } from 'node:http';
import { D as DhalEngine } from '../engine-CINpdFdb.js';
import { q as DhalOptions, k as DhalDecision } from '../types-C1dYoaci.js';
import 'node:events';
import '../lifecycle-Cev1XJUh.js';

declare function createNodeHttpDhal(options?: DhalOptions): {
    engine: DhalEngine;
    inspect(req: IncomingMessage, res: ServerResponse): Promise<DhalDecision>;
};

export { createNodeHttpDhal };
