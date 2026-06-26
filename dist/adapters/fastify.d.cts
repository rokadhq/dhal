import { D as DhalEngine } from '../engine-CusOB5og.cjs';
import { q as DhalOptions } from '../types-C1dYoaci.cjs';
import { FastifyPluginAsync } from 'fastify';
import 'node:events';
import '../lifecycle-CLClIjxX.cjs';

declare function dhalFastify(options?: DhalOptions): FastifyPluginAsync;
declare function dhalFastifyFromEngine(engine: DhalEngine): FastifyPluginAsync;

export { dhalFastify, dhalFastifyFromEngine };
