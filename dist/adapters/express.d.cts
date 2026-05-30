import { D as DhalEngine } from '../engine-CEH7vEA-.cjs';
import { p as DhalOptions } from '../types-6Dn0mDWH.cjs';
import { RequestHandler } from 'express';
import 'node:events';

declare function dhal(options?: DhalOptions): RequestHandler;
declare function dhalFromEngine(engine: DhalEngine): RequestHandler;

export { dhal, dhalFromEngine };
