"use client";

import Link from "next/link";
import { useState } from "react";

type UploadResult = {
  success?: boolean;
  docName?: string;
  chunkCount?: number;
  upserted?: number;
  error?: string;
  details?: string;
};

export default function AdminUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  async function handleUpload() {
    if (!file || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${apiUrl}/api/ingest`, {
        method: "POST",
        headers: {
          "x-admin-upload-token": process.env.NEXT_PUBLIC_ADMIN_UPLOAD_TOKEN || "",
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.details || data?.error || "Upload failed");
      }

      setResult(data);
    } catch (err: any) {
      setResult({
        error: "Upload failed",
        details: err?.message || "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  // Logout handler
  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Upload</h1>
            <p className="mt-2 text-sm text-slate-600">
              Upload SOP documents and ingest them into the knowledge base.
            </p>
          </div>

          {/* Navigation + Logout */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to Chat
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Upload Card */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="space-y-4">

            {/* File Picker */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Select SOP file (.docx)
              </label>
              <input
                type="file"
                accept=".docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full rounded-xl border border-slate-300 p-3 text-sm"
              />
            </div>

            {/* File Preview */}
            {file && (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <div className="font-medium text-slate-900">Selected file</div>
                <div className="mt-1">{file.name}</div>
                <div className="text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Uploading..." : "Upload and Ingest"}
              </button>
            </div>

            {/* Success */}
            {result?.success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <div className="font-semibold">Upload successful</div>
                <div className="mt-2">Document: {result.docName}</div>
                <div>Chunks created: {result.chunkCount}</div>
                <div>Records upserted: {result.upserted}</div>
              </div>
            )}

            {/* Error */}
            {result?.error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <div className="font-semibold">{result.error}</div>
                {result.details && <div className="mt-2">{result.details}</div>}
              </div>
            )}

            {/* Notes */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="font-medium text-slate-900">Notes</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Only .docx files are supported</li>
                <li>Upload goes to /api/ingest</li>
                <li>Vectors stored in Pinecone</li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}