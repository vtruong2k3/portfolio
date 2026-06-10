"use client";

import Link from "next/link";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface EntityTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  editHref?: (row: T) => string;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  createHref?: string;
  title: string;
}

/**
 * Generic admin entity table with Edit/Delete actions (Req 23.4).
 */
export function EntityTable<T extends { id: string }>({
  data, columns, isLoading, editHref, onDelete, isDeleting, createHref, title,
}: EntityTableProps<T>) {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {createHref && (
          <Link
            href={createHref}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-primary to-accent text-background hover:opacity-90 transition-opacity duration-200"
          >
            + New
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" aria-label="Loading..." />
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-muted text-sm">No records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table" aria-label={title}>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={String(col.key)} scope="col">{col.label}</th>
                  ))}
                  {(editHref || onDelete) && <th scope="col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    {columns.map((col) => (
                      <td key={String(col.key)}>
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key as string] ?? "")}
                      </td>
                    ))}
                    {(editHref || onDelete) && (
                      <td>
                        <div className="flex items-center gap-2">
                          {editHref && (
                            <Link
                              href={editHref(row)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-200 font-medium"
                            >
                              Edit
                            </Link>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(row.id)}
                              disabled={isDeleting}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors duration-200 font-medium disabled:opacity-50"
                              aria-label={`Delete record ${row.id}`}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
