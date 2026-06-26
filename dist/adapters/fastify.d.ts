import { D as DhalEngine } from '../engine-CINpdFdb.js';
import { q as DhalOptions } from '../types-C1dYoaci.js';
import { FastifyPluginAsync } from 'fastify';
import 'node:events';
import '../lifecycle-Cev1XJUh.js';

declare function dhalFastify(options?: DhalOptions): FastifyPluginAsync;
declare function dhalFastifyFromEngine(engine: DhalEngine): FastifyPluginAsync;

export { dhalFastify, dhalFastifyFromEngine };
