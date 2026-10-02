import { createHandler } from '../src/app.ts';
import { servicesFromEnv } from '../src/config.ts';

const handle = createHandler(servicesFromEnv());

Bun.serve({
  port: Number(process.env.PORT || 3001),
  fetch: handle,
});
