"use client";

import { useAdminAnalytics } from "@/hooks/mutations/use-admin-misc";

export default function AdminAnalyticsPage() {
  const { data, isLoading, error } = useAdminAnalytics();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted mt-1">Page view statistics. No personal data stored.</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" aria-label="Loading analytics..." />
        </div>
      )}

      {error && (
        <div className="glass rounded-2xl border border-border p-8 text-center text-muted text-sm">
          Unable to load analytics.
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-6">
          {/* Total views */}
          <div className="glass rounded-2xl border border-border p-6 flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl" aria-hidden="true">
              👁
            </div>
            <div>
              <p className="text-3xl font-bold gradient-text">{data.total.toLocaleString()}</p>
              <p className="text-sm text-muted">Total Page Views</p>
            </div>
          </div>

          {/* Top paths */}
          <div className="glass rounded-2xl border border-border overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="font-semibold text-foreground text-sm">Top Pages</h2>
            </div>
            <table className="admin-table" aria-label="Page view breakdown">
              <thead>
                <tr>
                  <th scope="col">Path</th>
                  <th scope="col">Views</th>
                  <th scope="col">Share</th>
                </tr>
              </thead>
              <tbody>
                {data.byPath.map(({ path, count }) => (
                  <tr key={path}>
                    <td className="font-mono text-xs">{path}</td>
                    <td>{count.toLocaleString()}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                            style={{ width: `${Math.round((count / data.total) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted w-10 text-right">
                          {Math.round((count / data.total) * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
