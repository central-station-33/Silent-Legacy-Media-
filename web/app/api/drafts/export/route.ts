import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { Draft } from "@/lib/types";

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  let query = supabase().from("drafts").select("*").order("created_at", { ascending: false });

  const pillar = params.get("pillar");
  const status = params.get("status");
  const q = params.get("q");
  if (pillar) query = query.eq("pillar", pillar);
  if (status) query = query.eq("status", status);
  if (q) {
    const like = `%${q}%`;
    query = query.or(
      `title.ilike.${like},subject_name.ilike.${like},primary_source_url.ilike.${like},body_content.ilike.${like}`
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Draft[];
  const columns: (keyof Draft)[] = [
    "id",
    "created_at",
    "title",
    "pillar",
    "subject_name",
    "status",
    "rejection_reason",
    "primary_source_url",
    "published_at",
  ];
  const header = columns.join(",");
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(",")).join("\n");
  const csv = `${header}\n${body}\n`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="drafts-export.csv"`,
    },
  });
}
