import { D as DhalEngine } from '../engine-DVVdPwjH.js';
import { p as DhalOptions } from '../types-6Dn0mDWH.js';
import { FastifyPluginAsync } from 'fastify';
import 'node:events';

declare function dhalFastify(options?: DhalOptions): FastifyPluginAsync;
declare function dhalFastifyFromEngine(engine: DhalEngine): FastifyPluginAsync;

export { dhalFastify, dhalFastifyFromEngine };
