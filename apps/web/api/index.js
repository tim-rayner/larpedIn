import { createHandler } from '../src/app.js';

Bun.serve({
  port: Number(process.env.PORT || 3000),
  hostname: process.env.HOST || '0.0.0.0',
  fetch: createHandler(),
});
console.log(`LarpedIn web running on port ${process.env.PORT || 3000}`);
