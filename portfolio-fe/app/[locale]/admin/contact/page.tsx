"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAdminContact, useMarkContactRead } from "@/hooks/mutations/use-admin-misc";
import type { ContactMessage } from "@/hooks/mutations/use-admin-misc";

export default function AdminContactPage() {
  const { data: messages = [], isLoading } = useAdminContact();
  const markRead = useMarkContactRead();
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleMarkRead(id: string) {
    try {
      await markRead.mutateAsync(id);
      toast.success("Marked as read");
    } catch {
      toast.error("Failed to update");
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Contact Inbox</h1>
        <p className="text-sm text-muted mt-1">{messages.filter((m) => !m.isRead).length} unread messages</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" aria-label="Loading..." />
        </div>
      ) : messages.length === 0 ? (
        <div className="glass rounded-2xl border border-border p-12 text-center text-muted text-sm">
          No messages yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-3" role="list" aria-label="Contact messages">
          {messages.map((msg: ContactMessage) => (
            <li
              key={msg.id}
              className={`glass rounded-2xl border transition-all duration-200 ${
                msg.isRead ? "border-border opacity-70" : "border-primary/20"
              }`}
            >
              <button
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
                onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
                aria-expanded={expanded === msg.id}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {!msg.isRead && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" aria-label="Unread" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{msg.name}</p>
                    <p className="text-xs text-muted truncate">{msg.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <time className="text-xs text-muted" dateTime={msg.createdAt}>
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </time>
                  <span className="text-muted text-sm" aria-hidden="true">
                    {expanded === msg.id ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {/* Expanded body */}
              {expanded === msg.id && (
                <div className="px-5 pb-5 border-t border-border pt-4">
                  <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap mb-4">{msg.message}</p>
                  {!msg.isRead && (
                    <button
                      onClick={() => handleMarkRead(msg.id)}
                      disabled={markRead.isPending}
                      className="text-xs px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-200 font-medium disabled:opacity-50"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
