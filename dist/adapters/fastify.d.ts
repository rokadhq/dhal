import { D as DhalEngine } from '../engine-DZ0jvLHu.js';
import { p as DhalOptions } from '../types-CX1y5ozy.js';
import { FastifyPluginAsync } from 'fastify';
import 'node:events';

declare function dhalFastify(options?: DhalOptions): FastifyPluginAsync;
declare function dhalFastifyFromEngine(engine: DhalEngine): FastifyPluginAsync;

export { dhalFastify, dhalFastifyFromEngine };
