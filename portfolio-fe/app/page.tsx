// Root page.tsx — the middleware redirects to /vi or /en,
// so this file is only a safety net and should never render.
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/vi');
}
