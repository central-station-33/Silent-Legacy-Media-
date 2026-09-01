import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Story } from "@/lib/types";
import { StoryDetail } from "./QueueClient";

export const dynamic = "force-dynamic";

async function loadStories(pillar?: string) {
  let query = supabase()
    .from("silent_legacy_stories")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (pillar) query = query.eq("pillar", pillar);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Story[];
}

async function loadStory(id: string) {
  const { data, error } = await supabase().from("silent_legacy_stories").select("*").eq("id", id).single();
  if (error) return null;
  return data as Story;
}

const PILLAR_LABEL: Record<string, string> = { pro: "Pro", w: "W", proof: "Proof" };

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ pillar?: string; id?: string }>;
}) {
  const params = await searchParams;
  const stories = await loadStories(params.pillar);
  const selected = params.id ? await loadStory(params.id) : stories[0] ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Editorial queue</h1>
        <p className="text-sm text-slate-500">
          Stories that cleared Scout &amp; Verifier, awaiting a human Approve / Reject decision.
        </p>
      </div>

      <div className="flex gap-2 text-sm">
        {["", "pro", "w", "proof"].map((p) => (
          <Link
            key={p || "all"}
            href={p ? `/queue?pillar=${p}` : "/queue"}
            className={`rounded-full px-3 py-1 border ${
              (params.pillar ?? "") === p ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-600"
            }`}
          >
            {p ? PILLAR_LABEL[p] : "All"}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
          {stories.length === 0 && <p className="p-4 text-sm text-slate-400">Queue is empty.</p>}
          {stories.map((s) => (
            <Link
              key={s.id}
              href={`/queue?id=${s.id}${params.pillar ? `&pillar=${params.pillar}` : ""}`}
              className={`block p-3 text-sm hover:bg-slate-50 ${selected?.id === s.id ? "bg-slate-50" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.scout?.subject ?? "Untitled"}</span>
                <span className="text-xs uppercase text-slate-400">{PILLAR_LABEL[s.pillar]}</span>
              </div>
              <div className="text-xs text-slate-400">
                confidence {s.verifier?.confidence ?? "—"} &middot; {new Date(s.created_at).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>

        <div className="lg:col-span-3 rounded-lg border border-slate-200 bg-white p-4">
          {selected ? (
            <StoryDetail story={selected} />
          ) : (
            <p className="text-sm text-slate-400">Select a story from the queue.</p>
          )}
        </div>
      </div>
    </div>
  );
}
