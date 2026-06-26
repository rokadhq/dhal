import { D as DhalEngine } from '../engine-CusOB5og.cjs';
import { q as DhalOptions } from '../types-C1dYoaci.cjs';
import { RequestHandler } from 'express';
import 'node:events';
import '../lifecycle-CLClIjxX.cjs';

declare function dhal(options?: DhalOptions): RequestHandler;
declare function dhalFromEngine(engine: DhalEngine): RequestHandler;

export { dhal, dhalFromEngine };
