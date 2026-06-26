import { D as DhalEngine } from '../engine-CXFMqEy1.cjs';
import { q as DhalOptions } from '../types-C1dYoaci.cjs';
import { RequestHandler } from 'express';
import 'node:events';

declare function dhal(options?: DhalOptions): RequestHandler;
declare function dhalFromEngine(engine: DhalEngine): RequestHandler;

export { dhal, dhalFromEngine };
