import { D as DhalEngine } from '../engine-B8uEuAgQ.cjs';
import { p as DhalOptions } from '../types-CX1y5ozy.cjs';
import { FastifyPluginAsync } from 'fastify';
import 'node:events';

declare function dhalFastify(options?: DhalOptions): FastifyPluginAsync;
declare function dhalFastifyFromEngine(engine: DhalEngine): FastifyPluginAsync;

export { dhalFastify, dhalFastifyFromEngine };
