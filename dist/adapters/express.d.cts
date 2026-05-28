import { D as DhalEngine } from '../engine-B8uEuAgQ.cjs';
import { p as DhalOptions } from '../types-CX1y5ozy.cjs';
import { RequestHandler } from 'express';
import 'node:events';

declare function dhal(options?: DhalOptions): RequestHandler;
declare function dhalFromEngine(engine: DhalEngine): RequestHandler;

export { dhal, dhalFromEngine };
