// Vercel's function bundle does not carry the `@larpedin/shared` workspace link, so the
// app imports the shared package by path. Everything else imports it through here.
export * from '../../../packages/shared/src/index';
