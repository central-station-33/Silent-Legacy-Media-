"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Story } from "@/lib/types";
import { approveStory, rejectStory } from "./actions";

export function StoryDetail({ story }: { story: Story }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const content = story.content ?? {};
  const blogPost = content.blogPost ?? {};

  async function handleApprove() {
    if (!formRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData(formRef.current);
      const decidedBy = String(fd.get("decided_by") ?? "");
      if (!decidedBy.trim()) throw new Error("Enter your name before approving.");

      const xThreadRaw = String(fd.get("xThread") ?? "");
      const nextContent = {
        ...content,
        blogPost: {
          headline: String(fd.get("headline") ?? ""),
          body: String(fd.get("body") ?? ""),
        },
        xThread: xThreadRaw.split("\n").map((s) => s.trim()).filter(Boolean),
        videoScript: String(fd.get("videoScript") ?? ""),
      };

      await approveStory(story.id, decidedBy, nextContent);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve story.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(fd: FormData) {
    setBusy(true);
    setError(null);
    try {
      const decidedBy = String(fd.get("decided_by") ?? "");
      if (!decidedBy.trim()) throw new Error("Enter your name before rejecting.");
      await rejectStory(story.id, decidedBy, fd);
      setRejecting(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject story.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase text-slate-400 mb-1">Source</div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
          <div>
            <span className="text-slate-400">Subject: </span>
            {story.scout?.subject ?? "—"}
          </div>
          {(story.scout?.sourceLinks ?? []).map((link, i) => (
            <a key={i} href={link} target="_blank" rel="noreferrer" className="block text-blue-600 hover:underline truncate">
              {link}
            </a>
          ))}
        </div>
      </div>

      {story.verifier && (
        <div>
          <div className="text-xs uppercase text-slate-400 mb-1">Verifier notes</div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
            <div>Confidence: {story.verifier.confidence ?? "—"}</div>
            {story.verifier.editorNote && <div>{story.verifier.editorNote}</div>}
            {!!story.verifier.failedRules?.length && (
              <div className="text-red-600">Failed rules: {story.verifier.failedRules.join(", ")}</div>
            )}
          </div>
        </div>
      )}

      <form ref={formRef} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Headline</label>
          <input
            name="headline"
            defaultValue={blogPost.headline ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Blog body</label>
          <textarea
            name="body"
            defaultValue={blogPost.body ?? ""}
            rows={6}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">X thread (one post per line)</label>
          <textarea
            name="xThread"
            defaultValue={(content.xThread ?? []).join("\n")}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Video script</label>
          <textarea
            name="videoScript"
            defaultValue={typeof content.videoScript === "string" ? content.videoScript : ""}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {story.status === "pending" && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Your name (for the audit trail)</label>
              <input name="decided_by" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleApprove}
                className="rounded-md bg-emerald-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-emerald-500 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setRejecting((v) => !v)}
                className="rounded-md border border-red-300 text-red-700 text-sm font-medium px-3 py-1.5 hover:bg-red-50"
              >
                Reject
              </button>
            </div>

            {rejecting && (
              <form action={handleReject} className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
                <input name="decided_by" placeholder="Your name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <textarea
                  name="editor_note"
                  placeholder="Rejection reason"
                  required
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-md bg-red-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-red-500 disabled:opacity-50"
                >
                  Confirm reject
                </button>
              </form>
            )}
          </>
        )}

        {story.status !== "pending" && (
          <p className="text-sm text-slate-500">
            Decided {story.decided_at ? new Date(story.decided_at).toLocaleString() : ""} by {story.decided_by ?? "—"}
            {story.editor_note ? ` — ${story.editor_note}` : ""}
          </p>
        )}
      </form>
    </div>
  );
}
