import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Draft, DraftStatus } from "@/lib/types";
import { NewDraftButton, EditDraftButton, ApproveButton, RejectButton } from "./DraftsClient";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; pillar?: string; status?: string };

async function loadDrafts(params: SearchParams) {
  let query = supabase().from("drafts").select("*").order("created_at", { ascending: false });

  if (params.pillar) query = query.eq("pillar", params.pillar);
  if (params.status) query = query.eq("status", params.status);
  if (params.q) {
    const q = `%${params.q}%`;
    query = query.or(
      `title.ilike.${q},subject_name.ilike.${q},primary_source_url.ilike.${q},body_content.ilike.${q},x_thread_text.ilike.${q},video_script.ilike.${q}`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Draft[];
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: DraftStatus }) {
  const colors: Record<DraftStatus, string> = {
    Pending: "bg-amber-100 text-amber-800",
    Approved: "bg-emerald-100 text-emerald-800",
    Rejected: "bg-red-100 text-red-800",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}>{status}</span>;
}

export default async function DraftsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const drafts = await loadDrafts(params);

  const counts = drafts.reduce(
    (acc, d) => {
      acc[d.status] += 1;
      return acc;
    },
    { Pending: 0, Approved: 0, Rejected: 0 } as Record<DraftStatus, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Drafts</h1>
          <p className="text-sm text-slate-500">Manually authored drafts &mdash; create, edit, approve, reject.</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/drafts/export?${new URLSearchParams(params as Record<string, string>).toString()}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-white"
          >
            Export CSV
          </a>
          <NewDraftButton />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-md">
        <KpiCard label="Pending" value={counts.Pending} />
        <KpiCard label="Approved" value={counts.Approved} />
        <KpiCard label="Rejected" value={counts.Rejected} />
      </div>

      <form className="flex flex-wrap items-center gap-2" method="get">
        <input
          type="text"
          name="q"
          defaultValue={params.q}
          placeholder="Search title, subject, source, body..."
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm w-72"
        />
        <select name="pillar" defaultValue={params.pillar ?? ""} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">All pillars</option>
          <option value="Pro">Pro</option>
          <option value="W">W</option>
          <option value="Proof">Proof</option>
        </select>
        <select name="status" defaultValue={params.status ?? ""} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
        <button type="submit" className="rounded-md bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800">
          Filter
        </button>
        <Link href="/drafts" className="text-sm text-slate-500 hover:underline">
          Clear
        </Link>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Pillar</th>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {drafts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No drafts found
                </td>
              </tr>
            )}
            {drafts.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-2 font-medium">{d.title}</td>
                <td className="px-4 py-2">{d.pillar}</td>
                <td className="px-4 py-2 text-slate-500">{d.subject_name ?? "—"}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={d.status} />
                  {d.status === "Rejected" && d.rejection_reason && (
                    <div className="text-xs text-slate-400 mt-0.5">{d.rejection_reason}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-500">{new Date(d.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-3">
                    <EditDraftButton draft={d} />
                    {d.status === "Pending" && (
                      <>
                        <ApproveButton id={d.id} />
                        <RejectButton id={d.id} />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
