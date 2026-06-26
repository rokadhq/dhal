import { D as DhalEngine } from '../engine-CINpdFdb.js';
import { q as DhalOptions } from '../types-C1dYoaci.js';
import { RequestHandler } from 'express';
import 'node:events';
import '../lifecycle-Cev1XJUh.js';

declare function dhal(options?: DhalOptions): RequestHandler;
declare function dhalFromEngine(engine: DhalEngine): RequestHandler;

export { dhal, dhalFromEngine };
