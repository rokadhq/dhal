import { D as DhalEngine } from '../engine-BeMQe4lr.js';
import { q as DhalOptions } from '../types-C1dYoaci.js';
import { FastifyPluginAsync } from 'fastify';
import 'node:events';

declare function dhalFastify(options?: DhalOptions): FastifyPluginAsync;
declare function dhalFastifyFromEngine(engine: DhalEngine): FastifyPluginAsync;

export { dhalFastify, dhalFastifyFromEngine };
