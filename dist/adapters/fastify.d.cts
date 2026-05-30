import { D as DhalEngine } from '../engine-CEH7vEA-.cjs';
import { p as DhalOptions } from '../types-6Dn0mDWH.cjs';
import { FastifyPluginAsync } from 'fastify';
import 'node:events';

declare function dhalFastify(options?: DhalOptions): FastifyPluginAsync;
declare function dhalFastifyFromEngine(engine: DhalEngine): FastifyPluginAsync;

export { dhalFastify, dhalFastifyFromEngine };
