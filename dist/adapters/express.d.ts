import { D as DhalEngine } from '../engine-BeMQe4lr.js';
import { q as DhalOptions } from '../types-C1dYoaci.js';
import { RequestHandler } from 'express';
import 'node:events';

declare function dhal(options?: DhalOptions): RequestHandler;
declare function dhalFromEngine(engine: DhalEngine): RequestHandler;

export { dhal, dhalFromEngine };
