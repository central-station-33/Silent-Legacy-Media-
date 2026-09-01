"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { ContentResult } from "@/lib/types";

// Staggers approved stories across the coming week, 3-4/day, per
// retool/EDITOR_PORTAL_SPEC.md's "Publish flow" section.
async function nextPublishSlot(): Promise<string> {
  const { count } = await supabase()
    .from("silent_legacy_stories")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved")
    .is("published_at", null);

  const alreadyScheduled = count ?? 0;
  const perDay = 3;
  const dayOffset = Math.floor(alreadyScheduled / perDay) + 1;
  const slotOfDay = alreadyScheduled % perDay;

  const slot = new Date();
  slot.setUTCDate(slot.getUTCDate() + dayOffset);
  slot.setUTCHours(14 + slotOfDay * 3, 0, 0, 0);
  return slot.toISOString();
}

async function notifyMake(payload: unknown) {
  const url = process.env.MAKE_PUBLISH_TRIGGER_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Failed to notify Make publish-trigger webhook", err);
  }
}

export async function updateStoryContent(id: string, content: ContentResult) {
  const { error } = await supabase().from("silent_legacy_stories").update({ content }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/queue");
}

export async function approveStory(id: string, decidedBy: string, content: ContentResult) {
  const scheduledPublishAt = await nextPublishSlot();

  const { error } = await supabase()
    .from("silent_legacy_stories")
    .update({
      status: "approved",
      content,
      decided_at: new Date().toISOString(),
      decided_by: decidedBy || "unknown",
      scheduled_publish_at: scheduledPublishAt,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  const { data: story } = await supabase()
    .from("silent_legacy_stories")
    .select("pillar")
    .eq("id", id)
    .single();

  await notifyMake({
    storyId: id,
    pillar: story?.pillar,
    scheduledPublishAt,
    content,
  });

  revalidatePath("/queue");
}

export async function rejectStory(id: string, decidedBy: string, formData: FormData) {
  const editorNote = String(formData.get("editor_note") ?? "").trim();
  if (!editorNote) throw new Error("A rejection reason is required.");

  const { error } = await supabase()
    .from("silent_legacy_stories")
    .update({
      status: "rejected",
      editor_note: editorNote,
      decided_at: new Date().toISOString(),
      decided_by: decidedBy || "unknown",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/queue");
}
