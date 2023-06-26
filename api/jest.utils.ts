import request from 'supertest';

import { build } from './src/app';

type FastifyTestInstance = Awaited<ReturnType<typeof build>>;

declare global {
  // eslint-disable-next-line no-var
  var fastifyTestInstance: FastifyTestInstance;
}

type Options = {
  sendCSRFToken: boolean;
};

/* eslint-disable @typescript-eslint/naming-convention */
const requests = {
  GET: (resource: string) => request(fastifyTestInstance?.server).get(resource),
  POST: (resource: string) =>
    request(fastifyTestInstance?.server).post(resource),
  PUT: (resource: string) => request(fastifyTestInstance?.server).put(resource),
  DELETE: (resource: string) =>
    request(fastifyTestInstance?.server).delete(resource)
};
/* eslint-enable @typescript-eslint/naming-convention */

export const getCsrfToken = (setCookies: string[]): string | undefined => {
  const csrfSetCookie = setCookies.find(str => str.includes('csrf_token'));
  const [csrfCookie] = csrfSetCookie?.split(';') ?? [];
  const [_key, csrfToken] = csrfCookie?.split('=') ?? [];

  return csrfToken;
};

export const ORIGIN = 'https://www.freecodecamp.org';

export function superRequest(
  resource: string,
  config: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    setCookies?: string[];
  },
  options?: Options
): request.Test {
  const { method, setCookies } = config;
  const { sendCSRFToken = true } = options ?? {};

  const req = requests[method](resource).set('Origin', ORIGIN);

  if (setCookies) {
    void req.set('Cookie', setCookies);
  }

  const csrfToken = (setCookies && getCsrfToken(setCookies)) ?? '';
  if (sendCSRFToken) {
    void req.set('CSRF-Token', csrfToken);
  }
  return req;
}

export function setupServer(): void {
  let fastify: FastifyTestInstance;
  beforeAll(async () => {
    fastify = await build();
    await fastify.ready();

    global.fastifyTestInstance = fastify;
  });

  afterAll(async () => {
    // Due to a prisma bug, this is not enough, we need to --force-exit jest:
    // https://github.com/prisma/prisma/issues/18146
    await fastifyTestInstance.close();
  });
}
