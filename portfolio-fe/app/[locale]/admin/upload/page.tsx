"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useUploadFile } from "@/hooks/mutations/use-admin-misc";

/**
 * ImageUploader — drag & drop or click to select (Req 23.6, Req 16.3).
 */
export default function AdminUploadPage() {
  const uploadMutation = useUploadFile();
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try {
        const { url } = await uploadMutation.mutateAsync(file);
        setUploadedUrls((prev) => [url, ...prev]);
        toast.success(`Uploaded: ${file.name}`);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Image Upload</h1>
        <p className="text-sm text-muted mt-1">Upload images for projects. Accepted: JPG, PNG, WebP, GIF, SVG.</p>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload image files"
        className={`glass rounded-2xl border-2 border-dashed transition-all duration-200 p-12 flex flex-col items-center justify-center gap-4 cursor-pointer ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        }`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}
      >
        <p className="text-4xl" aria-hidden="true">📷</p>
        <div className="text-center">
          <p className="font-semibold text-foreground text-sm">Drag & drop images here</p>
          <p className="text-muted text-xs mt-1">or click to browse</p>
        </div>
        {uploadMutation.isPending && (
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" aria-label="Uploading..." />
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="File input"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {/* Uploaded URLs */}
      {uploadedUrls.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-foreground mb-4">Uploaded Files</h2>
          <ul className="flex flex-col gap-2">
            {uploadedUrls.map((url) => (
              <li key={url} className="glass rounded-xl border border-border p-3 flex items-center justify-between gap-3">
                <code className="text-xs text-primary font-mono truncate">{url}</code>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(url);
                    toast.success("URL copied!");
                  }}
                  className="text-xs px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-200 shrink-0"
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
