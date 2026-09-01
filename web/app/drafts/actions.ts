"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { publishToGhost, textToHtml } from "@/lib/ghost";
import type { Draft, DraftPillar } from "@/lib/types";

const PILLARS: DraftPillar[] = ["Pro", "W", "Proof"];

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function nullableStr(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v.length ? v : null;
}

export async function createDraft(formData: FormData) {
  const title = str(formData, "title");
  const pillar = str(formData, "pillar") as DraftPillar;
  const body_content = str(formData, "body_content");

  if (!title || !body_content || !PILLARS.includes(pillar)) {
    throw new Error("Title, pillar, and body content are required.");
  }

  const { error } = await supabase()
    .from("drafts")
    .insert({
      title,
      pillar,
      body_content,
      x_thread_text: nullableStr(formData, "x_thread_text"),
      video_script: nullableStr(formData, "video_script"),
      primary_source_url: nullableStr(formData, "primary_source_url"),
      subject_name: nullableStr(formData, "subject_name"),
    });

  if (error) throw new Error(error.message);
  revalidatePath("/drafts");
}

export async function updateDraft(id: number, formData: FormData) {
  const title = str(formData, "title");
  const pillar = str(formData, "pillar") as DraftPillar;
  const body_content = str(formData, "body_content");

  if (!title || !body_content || !PILLARS.includes(pillar)) {
    throw new Error("Title, pillar, and body content are required.");
  }

  const { error } = await supabase()
    .from("drafts")
    .update({
      title,
      pillar,
      body_content,
      x_thread_text: nullableStr(formData, "x_thread_text"),
      video_script: nullableStr(formData, "video_script"),
      primary_source_url: nullableStr(formData, "primary_source_url"),
      subject_name: nullableStr(formData, "subject_name"),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/drafts");
}

export async function approveDraft(id: number) {
  const { data: draft, error: fetchError } = await supabase()
    .from("drafts")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  if ((draft as Draft).status !== "Pending") {
    throw new Error("This draft is no longer pending -- it may have already been approved or rejected.");
  }

  // Ghost is optional until it's set up (GHOST_API_URL / GHOST_ADMIN_API_KEY) --
  // publishToGhost returns null rather than throwing when unconfigured, so
  // approving still works before Ghost exists. A configured-but-failing
  // call throws and the draft stays Pending, since "approved" should mean
  // "actually published."
  const published = await publishToGhost({
    title: (draft as Draft).title,
    html: textToHtml((draft as Draft).body_content),
    tags: [(draft as Draft).pillar],
  });

  // The `.eq("status", "Pending")` re-check here (not just the read above)
  // closes the race window where two concurrent Approve clicks -- or one
  // click plus a retry -- both pass the read check and would otherwise
  // both call Ghost and both write. Only the first write actually matches
  // a Pending row; the second gets 0 rows back and errors instead of
  // silently double-publishing.
  const { data: updated, error } = await supabase()
    .from("drafts")
    .update({
      status: "Approved",
      published_at: new Date().toISOString(),
      rejection_reason: null,
      ghost_post_id: published?.id ?? null,
      ghost_url: published?.url ?? null,
    })
    .eq("id", id)
    .eq("status", "Pending")
    .select();
  if (error) throw new Error(error.message);
  if (!updated || updated.length === 0) {
    throw new Error(
      published
        ? `Published to Ghost (${published.url}) but this draft was already decided by someone else -- check for a duplicate post.`
        : "This draft is no longer pending -- it may have already been approved or rejected."
    );
  }
  revalidatePath("/drafts");
}

export async function rejectDraft(id: number, formData: FormData) {
  const reason = str(formData, "rejection_reason");
  if (!reason) throw new Error("A rejection reason is required.");

  const { data: updated, error } = await supabase()
    .from("drafts")
    .update({ status: "Rejected", rejection_reason: reason })
    .eq("id", id)
    .eq("status", "Pending")
    .select();
  if (error) throw new Error(error.message);
  if (!updated || updated.length === 0) {
    throw new Error("This draft is no longer pending -- it may have already been approved or rejected.");
  }
  revalidatePath("/drafts");
}
