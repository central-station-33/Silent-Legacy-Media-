"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { DraftPillar } from "@/lib/types";

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
  const { error } = await supabase()
    .from("drafts")
    .update({ status: "Approved", published_at: new Date().toISOString(), rejection_reason: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/drafts");
}

export async function rejectDraft(id: number, formData: FormData) {
  const reason = str(formData, "rejection_reason");
  if (!reason) throw new Error("A rejection reason is required.");

  const { error } = await supabase()
    .from("drafts")
    .update({ status: "Rejected", rejection_reason: reason })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/drafts");
}
