import createMiddleware from 'next-intl/middleware';
import { routing } from './lib/i18n/routing';

// next-intl middleware handles locale detection, redirection, and
// locale prefix in URLs (Req 19.1–19.5).
export default createMiddleware(routing);

export const config = {
  // Match all paths except static files, _next internals, and API routes.
  matcher: ['/((?!_next|_vercel|api|.*\\..*).*)'],
};
