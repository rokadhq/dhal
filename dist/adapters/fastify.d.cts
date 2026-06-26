import { D as DhalEngine } from '../engine-CXFMqEy1.cjs';
import { q as DhalOptions } from '../types-C1dYoaci.cjs';
import { FastifyPluginAsync } from 'fastify';
import 'node:events';

declare function dhalFastify(options?: DhalOptions): FastifyPluginAsync;
declare function dhalFastifyFromEngine(engine: DhalEngine): FastifyPluginAsync;

export { dhalFastify, dhalFastifyFromEngine };
