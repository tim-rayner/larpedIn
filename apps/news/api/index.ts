export {};
// Imports are loaded inside a try/catch so a module-resolution failure on the host logs
// which module could not be found, instead of an opaque `ResolveMessage {}`.
try {
  const [{ createHandler }, { servicesFromEnv }] = await Promise.all([import('../src/app.ts'), import('../src/config.ts')]);
  Bun.serve({
    port: Number(process.env.PORT || 3001),
    fetch: createHandler(servicesFromEnv()),
  });
} catch (error) {
  const detail = error as {message?: string; specifier?: string; referrer?: string; position?: unknown};
  console.error('News service failed to start:', detail.message, '| specifier:', detail.specifier, '| referrer:', detail.referrer, '| cwd:', process.cwd());
  throw error;
}
