// Root layout — redirects to locale-prefixed routes via middleware.
// This file must exist but is minimal; the [locale]/layout.tsx does the real work.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
