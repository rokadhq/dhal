import { D as DhalEngine } from '../engine-DZ0jvLHu.js';
import { p as DhalOptions } from '../types-CX1y5ozy.js';
import { RequestHandler } from 'express';
import 'node:events';

declare function dhal(options?: DhalOptions): RequestHandler;
declare function dhalFromEngine(engine: DhalEngine): RequestHandler;

export { dhal, dhalFromEngine };
